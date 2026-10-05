import { useEffect, useState } from 'react';
import { api } from './api.js';
import { STAGES, LABELS } from './constants.js';

export default function Dashboard({ tick }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // The delay means a burst of events causes only ONE refetch
    const timer = setTimeout(async () => {
      try {
        setData(await api('/dashboard'));
        setError('');
      } catch (err) {
        setError(err.message);
      }
    }, tick === 0 ? 0 : 300);
    return () => clearTimeout(timer);
  }, [tick]);

  if (error) return <p className="empty">{error}</p>;
  if (!data) return null;

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