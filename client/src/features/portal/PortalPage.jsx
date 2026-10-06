import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { upsertDoc } from '../../lib/docs.js';
import DocRow from '../../components/DocRow.jsx';

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

  if (!data) return <p className="empty">{message || 'Loading...'}</p>;

  return (
    <div className="portal">
      <h2>Hello, {data.lead.name}</h2>
      <p>Your case is currently at: <strong>{data.lead.stage}</strong></p>

      <form className="upload" onSubmit={submit}>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0] || null)} />
        <button disabled={busy}>{busy ? 'Uploading...' : 'Upload'}</button>
      </form>
      {message && <p className="note">{message}</p>}

      <h3>Your documents ({data.documents.length})</h3>
      {data.documents.length === 0 && <p>No documents yet.</p>}
      {data.documents.map((d) => <DocRow key={d._id} doc={d} onError={setMessage} />)}
    </div>
  );
}