import { useCallback, useEffect, useState } from 'react';
import { api, downloadFile } from './api.js';

const TYPES = [
  ['payslip', 'Payslip'],
  ['id', 'ID'],
  ['bank_statement', 'Bank statement'],
  ['other', 'Other'],
];

export default function ClientPortal({ onLogout }) {
  const [data, setData] = useState(null);
  const [type, setType] = useState('payslip');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api('/me/case'));
    } catch (err) {
      if (err.status === 401) onLogout();
      else setMessage(err.message);
    }
  }, [onLogout]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const formEl = e.target;
    if (!file) return setMessage('Choose a file first');

    const form = new FormData();
    form.append('type', type); // text fields first, then the file
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
      {data.documents.map((d) => (
        <div key={d._id} className="doc">
          <span>{d.originalName} <small>({d.type})</small></span>
          <span className={`pill ${d.status}`}>{d.status}</span>
          <button onClick={() => downloadFile(d._id, d.originalName).catch((err) => setMessage(err.message))}>
            Download
          </button>
        </div>
      ))}
    </div>
  );
}