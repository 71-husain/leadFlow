import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { STAGES, LABELS, STAGE_ACCENT } from '../../lib/constants.js';
import { useLeads } from './useLeads.js';
import LeadCard from './LeadCard.jsx';
import Button from '../../components/Button.jsx';
import Spinner from '../../components/Spinner.jsx';

export default function BoardPage() {
  const { leads, loading, moveLead, convert } = useLeads();
  const [credentials, setCredentials] = useState(null);
  const [overStage, setOverStage] = useState(null); // column currently highlighted during a drag
  const navigate = useNavigate();

  if (loading) return <Spinner label="Loading pipeline..." />;

  const handleConvert = async (lead) => {
    const result = await convert(lead);
    if (result) setCredentials(result); // shown once; the server never returns it again
  };

  return (
    <>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
        <span className="text-sm text-slate-500">{leads.length} leads</span>
      </div>

      {credentials && (
        <div className="mb-4 space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Client login created. Share it now, it will not be shown again.</strong>
          <div>Email: <span className="font-mono">{credentials.email}</span></div>
          <div>Temporary password: <span className="font-mono">{credentials.temporaryPassword}</span></div>
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => setCredentials(null)}>Done</Button>
        </div>
      )}

      {leads.length === 0 && (
        <p className="mb-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          No leads yet. When someone submits your form, the lead appears here instantly.
        </p>
      )}

      <div className="flex items-start gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const items = leads.filter((l) => l.stage === stage);
          return (
            <div
              key={stage}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverStage(null); }}
              onDrop={(e) => {
                e.preventDefault();
                setOverStage(null);
                moveLead(e.dataTransfer.getData('text/plain'), stage);
              }}
              className={`w-72 shrink-0 rounded-xl border-t-4 bg-slate-100 p-3 transition ${STAGE_ACCENT[stage].border} ${
                overStage === stage ? 'ring-2 ring-indigo-300' : ''
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">{LABELS[stage]}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">{items.length}</span>
              </div>
              <div className="min-h-16 space-y-2">
                {items.map((lead) => (
                  <LeadCard
                    key={lead._id}
                    lead={lead}
                    onOpen={(l) => navigate(`/board/leads/${l._id}`)}
                    onConvert={handleConvert}
                  />
                ))}
                {items.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Drop leads here</p>}
              </div>
            </div>
          );
        })}
      </div>

      <Outlet context={{ leads }} />
    </>
  );
}