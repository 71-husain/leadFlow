export default function LeadCard({ lead, onOpen, onConvert }) {
  return (
    <div
      className="card"
      draggable
      onClick={() => onOpen(lead)}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', lead._id)}
    >
      <strong>{lead.name}</strong>
      <div>{lead.email}</div>
      <div>{lead.phone}</div>
      {lead.duplicateOf && <span className="badge">Known contact</span>}
      {lead.clientUserId ? (
        <span className="badge client">Client</span>
      ) : (
        lead.email && (
          <button className="small" onClick={(e) => { e.stopPropagation(); onConvert(lead); }}>
            Convert to client
          </button>
        )
      )}
    </div>
  );
}