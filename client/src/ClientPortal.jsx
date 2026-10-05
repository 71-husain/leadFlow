import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api, API, getToken } from "./api.js";
import { upsertDoc } from "./docs.js";
import DocRow from "./docRow.jsx";

const TYPES = [
  ["payslip", "Payslip"],
  ["id", "ID"],
  ["bank_statement", "Bank statement"],
  ["other", "Other"],
];

export default function ClientPortal({ onLogout }) {
  const [data, setData] = useState(null);
  const [type, setType] = useState("payslip");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api("/me/case"));
    } catch (err) {
      if (err.status === 401) onLogout();
      else setMessage(err.message);
    }
  }, [onLogout]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = io(API, { auth: { token: getToken() } });

    const onDoc = ({ document: d }) =>
      setData((prev) =>
        prev ? { ...prev, documents: upsertDoc(prev.documents, d) } : prev,
      );
    socket.on("document:created", onDoc);
    socket.on("document:updated", onDoc);

    // Events sent while we were disconnected are gone, so refetch on every reconnect
    let firstConnect = true;
    socket.on("connect", () => {
      if (!firstConnect) load();
      firstConnect = false;
    });
    socket.on("connect_error", (err) => {
      if (err.message === "Not authenticated") onLogout();
    });

    return () => socket.disconnect();
  }, [load, onLogout]);

  const submit = async (e) => {
    e.preventDefault();
    const formEl = e.target;
    if (!file) return setMessage("Choose a file first");

    const form = new FormData();
    form.append("type", type); // text fields first, then the file
    form.append("file", file);

    setBusy(true);
    setMessage("");
    try {
      await api("/me/documents", { method: "POST", body: form });
      setFile(null);
      formEl.reset();
      setMessage("Uploaded. We will check it shortly.");
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="empty">{message || "Loading..."}</p>;

  return (
    <div className="portal">
      <h2>Hello, {data.lead.name}</h2>
      <p>
        Your case is currently at: <strong>{data.lead.stage}</strong>
      </p>

      <form className="upload" onSubmit={submit}>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setFile(e.target.files[0] || null)}
        />
        <button disabled={busy}>{busy ? "Uploading..." : "Upload"}</button>
      </form>
      {message && <p className="note">{message}</p>}

      <h3>Your documents ({data.documents.length})</h3>
      {data.documents.length === 0 && <p>No documents yet.</p>}
      {data.documents.map((d) => <DocRow key={d._id} doc={d} onError={setMessage} />)}
    </div>
  );
}
