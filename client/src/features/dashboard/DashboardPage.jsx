import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { STAGES, LABELS } from '../../lib/constants.js';

export default function DashboardPage() {
  const { socket, reconnects } = useSocket();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api('/dashboard'));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load, reconnects]);

  useEffect(() => {
    if (!socket) return;
    let timer;
    // A burst of changes causes ONE refetch, 300 ms after the last one
    const onChange = () => { clearTimeout(timer); timer = setTimeout(load, 300); };
    socket.on('dashboard:changed', onChange);
    return () => { clearTimeout(timer); socket.off('dashboard:changed', onChange); };
  }, [socket, load]);

  if (error) return <p className="empty">{error}</p>;
  if (!data) return <p className="empty">Loading...</p>;

  const max = Math.max(1, ...Object.values(data.byStage));
  const tiles = [
    ['Total leads', data.totals.leads],
    ['Clients', data.totals.clients],
    ['New (7 days)', data.totals.newLast7Days],
    ['Known contacts', data.totals.duplicates],
    ['Win rate', data.winRate === null ? '–' : `${data.winRate}%`],
  ];

  return (
    <section className="dashboard">
      <div className="tiles">
        {tiles.map(([label, value]) => (
          <div key={label} className="tile"><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <div className="bars">
        {STAGES.map((s) => (
          <div key={s} className="bar-row">
            <span>{LABELS[s]}</span>
            <div className="bar"><div style={{ width: `${(data.byStage[s] / max) * 100}%` }} /></div>
            <b>{data.byStage[s]}</b>
          </div>
        ))}
      </div>
      <div className="doc-summary">
        Documents:
        {Object.entries(data.documents).map(([status, n]) => (
          <span key={status} className={`pill ${status}`}>{status} {n}</span>
        ))}
        <small>{data.cached ? 'from cache' : 'fresh'} · {new Date(data.generatedAt).toLocaleTimeString()}</small>
      </div>
    </section>
  );
}