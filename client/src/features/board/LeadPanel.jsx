import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { LABELS } from '../../lib/constants.js';
import { upsertDoc } from '../../lib/docs.js';
import DocRow from '../../components/DocRow.jsx';

export default function LeadPanel() {
  const { id } = useParams();
  const { leads } = useOutletContext();
  const navigate = useNavigate();
  const notify = useToast();
  const { socket, reconnects } = useSocket();
  const [docs, setDocs] = useState([]);

  const lead = leads.find((l) => l._id === id);
  const isClient = Boolean(lead?.clientUserId);
  const close = () => navigate('/board');

  useEffect(() => {
    setDocs([]);
    if (!isClient) return;
    api(`/leads/${id}/documents`)
      .then(({ documents }) => setDocs(documents))
      .catch((err) => notify(err.message));
  }, [id, isClient, reconnects, notify]);

  useEffect(() => {
    if (!socket) return;
    const onDoc = ({ document: d }) => {
      if (d.leadId === id) setDocs((prev) => upsertDoc(prev, d));
    };
    socket.on('document:created', onDoc);
    socket.on('document:updated', onDoc);
    return () => {
      socket.off('document:created', onDoc);
      socket.off('document:updated', onDoc);
    };
  }, [socket, id]);

  if (!lead) {
    return (
      <aside className="panel">
        <button className="close" onClick={close}>×</button>
        <p>Lead not found.</p>
      </aside>
    );
  }

  const verified = docs.filter((d) => d.status === 'verified').length;

  return (
    <aside className="panel">
      <button className="close" onClick={close}>×</button>
      <h3>{lead.name}</h3>
      <p>{lead.email}<br />{lead.phone}</p>
      <p>Stage: <strong>{LABELS[lead.stage]}</strong>{isClient ? ' · Client' : ''}</p>
      {!isClient ? (
        <p>Convert this lead to a client so they can upload documents.</p>
      ) : (
        <>
          <h4>Documents: {verified} of {docs.length} verified</h4>
          {docs.length === 0 && <p>No documents uploaded yet.</p>}
          {docs.map((d) => <DocRow key={d._id} doc={d} onError={notify} />)}
        </>
      )}
    </aside>
  );
}