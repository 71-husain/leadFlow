import Button from '../../components/Button.jsx';

export default function LeadCard({ lead, onOpen, onConvert }) {
  return (
    <div
      draggable
      onClick={() => onOpen(lead)}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', lead._id)}
      className="cursor-grab rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md active:cursor-grabbing"
    >
      <div className="font-medium text-slate-900">{lead.name}</div>
      <div className="mt-0.5 truncate text-xs text-slate-500">{lead.email || 'No email'}</div>
      {lead.phone && <div className="text-xs text-slate-500">{lead.phone}</div>}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {lead.duplicateOf && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            Known contact
          </span>
        )}
        {lead.clientUserId && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">Client</span>
        )}
        <span className="ml-auto text-[11px] text-slate-400">
          {new Date(lead.createdAt).toLocaleDateString()}
        </span>
      </div>

      {!lead.clientUserId && lead.email && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-2 w-full"
          onClick={(e) => { e.stopPropagation(); onConvert(lead); }}
        >
          Convert to client
        </Button>
      )}
    </div>
  );
}