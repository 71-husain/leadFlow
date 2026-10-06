import { downloadFile } from '../api/client.js';
import Button from './Button.jsx';

const LABELS = { pending: 'Waiting', checking: 'Checking…', verified: 'Verified', failed: 'Failed' };
const PILL = {
  pending: 'bg-amber-100 text-amber-800',
  checking: 'bg-sky-100 text-sky-800 animate-pulse',
  verified: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800',
};

export default function DocRow({ doc, onError }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-800">{doc.originalName}</div>
        <div className="text-xs text-slate-500">
          {doc.type.replace('_', ' ')}
          {doc.failureReason && doc.status !== 'verified' && (
            <span className="text-amber-700">
              {' '}· {doc.status === 'pending' ? 'retrying after: ' : ''}{doc.failureReason}
            </span>
          )}
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${PILL[doc.status]}`}>
        {LABELS[doc.status]}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => downloadFile(doc._id, doc.originalName).catch((e) => onError?.(e.message))}
      >
        Download
      </Button>
    </div>
  );
}