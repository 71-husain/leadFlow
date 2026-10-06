import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { LABELS } from '../../lib/constants.js';

export function useLeads() {
  const { user } = useAuth();
  const { socket, reconnects } = useSocket();
  const notify = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Insert or replace, but never let an OLDER version overwrite a newer one
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
      const { leads } = await api('/leads');
      setLeads(leads);
    } catch {
      notify('Could not load leads');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  // Runs on first load and again after every reconnect (events missed while offline are gone)
  useEffect(() => { load(); }, [load, reconnects]);

  useEffect(() => {
    if (!socket) return;
    const onCreated = ({ lead }) => { upsert(lead); notify(`New lead: ${lead.name}`); };
    const onMoved = ({ lead, movedBy }) => {
      upsert(lead);
      if (movedBy && movedBy.id !== user.id) notify(`${movedBy.name} moved ${lead.name} to ${LABELS[lead.stage]}`);
    };
    const onUpdated = ({ lead }) => upsert(lead);

    socket.on('lead:created', onCreated);
    socket.on('lead:moved', onMoved);
    socket.on('lead:updated', onUpdated);
    return () => {
      socket.off('lead:created', onCreated);
      socket.off('lead:moved', onMoved);
      socket.off('lead:updated', onUpdated);
    };
  }, [socket, upsert, notify, user.id]);

  const moveLead = async (leadId, stage) => {
    const lead = leads.find((l) => l._id === leadId);
    if (!lead || lead.stage === stage) return;

    setLeads((prev) => prev.map((l) => (l._id === leadId ? { ...l, stage } : l))); // optimistic
    try {
      const { lead: saved } = await api(`/leads/${leadId}/stage`, {
        method: 'PATCH',
        body: { stage, version: lead.version },
      });
      upsert(saved);
    } catch (err) {
      if (err.status === 409 && err.data?.lead) {
        upsert(err.data.lead);
        notify('Someone else just changed this lead. Board refreshed.');
      } else {
        notify(err.message);
        load();
      }
    }
  };

  const convert = async (lead) => {
    try {
      const { lead: updated, credentials } = await api(`/leads/${lead._id}/convert`, { method: 'POST' });
      upsert(updated);
      return credentials;
    } catch (err) {
      notify(err.message);
      return null;
    }
  };

  return { leads, loading, moveLead, convert };
}