import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api, API, getToken } from "./api.js";

const STAGES = ["new", "contacted", "qualified", "application", "won", "lost"];
const LABELS = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  application: "Application",
  won: "Won",
  lost: "Lost",
};

export default function Board({ user, onLogout }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("connecting");
  const [toast, setToast] = useState("");
  const [credentials, setCredentials] = useState(null);
  const toastTimer = useRef();

  const notify = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  };

  // Insert or replace a lead, but never let an OLDER version overwrite a newer one
  const upsert = useCallback((incoming) => {
    setLeads((prev) => {
      const i = prev.findIndex((l) => l._id === incoming._id);
      if (i === -1) return [incoming, ...prev];
      if (incoming.version < prev[i].version) return prev;
      const next = [...prev];
      next[i] = incoming;
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const { leads } = await api("/leads");
      setLeads(leads);
    } catch (err) {
      if (err.status === 401) onLogout();
      else notify("Could not load leads");
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    load();

    const socket = io(API, { auth: { token: getToken() } });
    socket.on("connect", () => setStatus("live"));
    socket.on("disconnect", () => setStatus("offline"));
    socket.on("connect_error", (err) => {
      setStatus("offline");
      if (err.message === "Not authenticated") onLogout();
    });
    // After a dropped connection comes back, events sent in the gap are lost, so refetch
    socket.io.on("reconnect", load);

    socket.on("lead:created", ({ lead }) => {
      upsert(lead);
      notify(`New lead: ${lead.name}`);
    });

    socket.on("lead:moved", ({ lead, movedBy }) => {
      upsert(lead);
      if (movedBy && movedBy.id !== user.id) {
        notify(`${movedBy.name} moved ${lead.name} to ${LABELS[lead.stage]}`);
      }
    });

    socket.on("lead:updated", ({ lead }) => upsert(lead)); // e.g. someone converted a lead

    return () => socket.disconnect();
  }, [load, upsert, onLogout, user.id]);

  const moveLead = async (leadId, stage) => {
    const lead = leads.find((l) => l._id === leadId);
    if (!lead || lead.stage === stage) return;

    // Optimistic: show the move immediately, then let the server confirm or correct it
    setLeads((prev) =>
      prev.map((l) => (l._id === leadId ? { ...l, stage } : l)),
    );

    try {
      const { lead: saved } = await api(`/leads/${leadId}/stage`, {
        method: "PATCH",
        body: { stage, version: lead.version },
      });
      upsert(saved);
    } catch (err) {
      if (err.status === 409 && err.data?.lead) {
        upsert(err.data.lead); // snap the card to where it really is
        notify("Someone else just changed this lead. Board refreshed.");
      } else {
        notify(err.message);
        load();
      }
    }
  };

  const convert = async (lead) => {
    try {
      const { lead: updated, credentials } = await api(
        `/leads/${lead._id}/convert`,
        { method: "POST" },
      );
      upsert(updated);
      setCredentials(credentials); // shown once; the server never stores or returns it again
    } catch (err) {
      notify(err.message);
    }
  };
  if (loading) return <p className="empty">Loading...</p>;

  return (
    <>
      <div className="status">
        <span className={`dot ${status}`} />{" "}
        {status === "live" ? "Live" : status}
      </div>
      {toast && <div className="toast">{toast}</div>}

      {credentials && (
        <div className="credentials">
          <strong>
            Client login created. Share it now, it will not be shown again.
          </strong>
          <div>Email: {credentials.email}</div>
          <div>Temporary password: {credentials.temporaryPassword}</div>
          <button onClick={() => setCredentials(null)}>Done</button>
        </div>
      )}

      <div className="board">
        {STAGES.map((stage) => {
          const items = leads.filter((l) => l.stage === stage);
          return (
            <div
              key={stage}
              className="column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                moveLead(e.dataTransfer.getData("text/plain"), stage);
              }}
            >
              <h3>
                {LABELS[stage]} <span>{items.length}</span>
              </h3>
              {items.map((lead) => (
                <div
                  key={lead._id}
                  className="card"
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", lead._id)
                  }
                >
                  <strong>{lead.name}</strong>
                  <div>{lead.email}</div>
                  <div>{lead.phone}</div>
                  {lead.duplicateOf && (
                    <span className="badge">Known contact</span>
                  )}

                  {lead.clientUserId ? (
                    <span className="badge client">Client</span>
                  ) : (
                    lead.email && (
                      <button className="small" onClick={() => convert(lead)}>
                        Convert to client
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
