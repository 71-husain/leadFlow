import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { STAGES, LABELS } from '../../lib/constants.js';
import { useLeads } from './useLeads.js';
import LeadCard from './LeadCard.jsx';

export default function BoardPage() {
  const { leads, loading, moveLead, convert } = useLeads();
  const [credentials, setCredentials] = useState(null);
  const navigate = useNavigate();

  if (loading) return <p className="empty">Loading...</p>;

  const handleConvert = async (lead) => {
    const result = await convert(lead);
    if (result) setCredentials(result); // shown once; the server never returns it again
  };

  return (
    <>
      {credentials && (
        <div className="credentials">
          <strong>Client login created. Share it now, it will not be shown again.</strong>
          <div>Email: {credentials.email}</div>
          <div>Temporary password: {credentials.temporaryPassword}</div>
          <button onClick={() => setCredentials(null)}>Done</button>
        </div>
      )}

      <div className="board">
        {STAGES.map((stage) => {
          const items = leads.filter((l) => l.stage === stage);
          return (
            <div
              key={stage}
              className="column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); moveLead(e.dataTransfer.getData('text/plain'), stage); }}
            >
              <h3>{LABELS[stage]} <span>{items.length}</span></h3>
              {items.map((lead) => (
                <LeadCard
                  key={lead._id}
                  lead={lead}
                  onOpen={(l) => navigate(`/board/leads/${l._id}`)}
                  onConvert={handleConvert}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* the open lead panel (child route) renders here */}
      <Outlet context={{ leads }} />
    </>
  );
}