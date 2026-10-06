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

  useEffect(() => {
  const onKey = (e) => { if (e.key === 'Escape') navigate('/board'); };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [navigate]);

 const shell = (children) => (
  <div className="fixed inset-0 z-30">
    <div className="absolute inset-0 bg-slate-900/30" onClick={close} />
    <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
      <button onClick={close} className="absolute right-4 top-4 rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100" aria-label="Close">×</button>
      {children}
    </aside>
  </div>
);

if (!lead) return shell(<p className="text-sm text-slate-500">Lead not found.</p>);

const verified = docs.filter((d) => d.status === 'verified').length;
const pct = docs.length ? (verified / docs.length) * 100 : 0;

return shell(
  <>
    <h2 className="pr-8 text-xl font-semibold tracking-tight">{lead.name}</h2>
    <p className="mt-1 text-sm text-slate-500">{lead.email}{lead.phone ? ` · ${lead.phone}` : ''}</p>
    <div className="mt-3 flex items-center gap-2 text-sm">
      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-medium text-indigo-700">{LABELS[lead.stage]}</span>
      {isClient && <span className="rounded-full bg-sky-100 px-2.5 py-0.5 font-medium text-sky-800">Client</span>}
    </div>

    <div className="mt-6">
      {!isClient ? (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
          Convert this lead to a client so they can upload documents.
        </p>
      ) : (
        <>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Documents</h3>
            <span className="text-xs text-slate-500">{verified} of {docs.length} verified</span>
          </div>
          <div className="mb-4 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          {docs.length === 0 && <p className="text-sm text-slate-500">No documents uploaded yet.</p>}
          <div className="space-y-2">
            {docs.map((d) => <DocRow key={d._id} doc={d} onError={notify} />)}
          </div>
        </>
      )}
    </div>
  </>
);
}