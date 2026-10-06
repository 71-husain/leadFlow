import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { STAGES, LABELS } from '../../lib/constants.js';
import Spinner from '../../components/Spinner.jsx';
import { STAGE_ACCENT } from '../../lib/constants.js';

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

  if (error) return <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
if (!data) return <Spinner label="Loading dashboard..." />;

const max = Math.max(1, ...Object.values(data.byStage));
const tiles = [
  ['Total leads', data.totals.leads],
  ['Clients', data.totals.clients],
  ['New (7 days)', data.totals.newLast7Days],
  ['Known contacts', data.totals.duplicates],
  ['Win rate', data.winRate === null ? '–' : `${data.winRate}%`],
];
const PILL = {
  pending: 'bg-amber-100 text-amber-800', checking: 'bg-sky-100 text-sky-800',
  verified: 'bg-emerald-100 text-emerald-800', failed: 'bg-rose-100 text-rose-800',
};

return (
  <section className="space-y-6">
    <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {tiles.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
      ))}
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Leads by stage</h2>
        <div className="space-y-3">
          {STAGES.map((s) => (
            <div key={s} className="grid grid-cols-[90px_1fr_32px] items-center gap-3 text-sm">
              <span className="text-slate-600">{LABELS[s]}</span>
              <div className="h-2.5 rounded-full bg-slate-100">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${STAGE_ACCENT[s].bar}`}
                  style={{ width: `${(data.byStage[s] / max) * 100}%` }}
                />
              </div>
              <b className="text-right">{data.byStage[s]}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Document checks</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.documents).map(([status, n]) => (
            <span key={status} className={`rounded-full px-3 py-1 text-sm font-medium ${PILL[status]}`}>
              {status} · {n}
            </span>
          ))}
        </div>
      </div>
    </div>

    <p className="text-xs text-slate-400">
      {data.cached ? 'Served from cache' : 'Freshly computed'} · {new Date(data.generatedAt).toLocaleTimeString()}
    </p>
  </section>
);
}