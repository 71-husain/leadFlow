import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { upsertDoc } from '../../lib/docs.js';
import DocRow from '../../components/DocRow.jsx';
import Button from '../../components/Button.jsx';
import Spinner from '../../components/Spinner.jsx';
import { LABELS } from '../../lib/constants.js';

const TYPES = [
  ['payslip', 'Payslip'],
  ['id', 'ID'],
  ['bank_statement', 'Bank statement'],
  ['other', 'Other'],
];

export default function PortalPage() {
  const { socket, reconnects } = useSocket();
  const [data, setData] = useState(null);
  const [type, setType] = useState('payslip');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api('/me/case'));
    } catch (err) {
      setMessage(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load, reconnects]);

  useEffect(() => {
    if (!socket) return;
    const onDoc = ({ document: d }) =>
      setData((prev) => (prev ? { ...prev, documents: upsertDoc(prev.documents, d) } : prev));
    socket.on('document:created', onDoc);
    socket.on('document:updated', onDoc);
    return () => {
      socket.off('document:created', onDoc);
      socket.off('document:updated', onDoc);
    };
  }, [socket]);

  const submit = async (e) => {
    e.preventDefault();
    const formEl = e.target;
    if (!file) return setMessage('Choose a file first');

    const form = new FormData();
    form.append('type', type);
    form.append('file', file);

    setBusy(true);
    setMessage('');
    try {
      await api('/me/documents', { method: 'POST', body: form });
      setFile(null);
      formEl.reset();
      setMessage('Uploaded. We will check it shortly.');
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return message ? <p className="text-sm text-rose-700">{message}</p> : <Spinner />;

return (
  <div className="mx-auto max-w-2xl space-y-6">
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Hello, {data.lead.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your case is currently at{' '}
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-medium text-indigo-700">
          {LABELS[data.lead.stage]}
        </span>
      </p>
    </div>

    <form onSubmit={submit} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Upload a document</h2>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setFile(e.target.files[0] || null)}
          className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <Button disabled={busy}>{busy ? 'Uploading...' : 'Upload'}</Button>
      </div>
      <p className="mt-2 text-xs text-slate-400">PDF, JPG or PNG, up to 5 MB.</p>
      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    </form>

    <div>
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Your documents ({data.documents.length})</h2>
      {data.documents.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          No documents yet. Upload your first one above.
        </p>
      )}
      <div className="space-y-2">
        {data.documents.map((d) => <DocRow key={d._id} doc={d} onError={setMessage} />)}
      </div>
    </div>
  </div>
);
}