import { downloadFile } from '../api/client.js';

const LABELS = { pending: 'Waiting', checking: 'Checking…', verified: 'Verified', failed: 'Failed' };

export default function DocRow({ doc, onError }) {
  return (
    <div className="doc">
      <span>
        {doc.originalName} <small>({doc.type.replace('_', ' ')})</small>
        {doc.failureReason && doc.status !== 'verified' && (
          <small className="reason">
            {' '}· {doc.status === 'pending' ? 'retrying after: ' : ''}{doc.failureReason}
          </small>
        )}
      </span>
      <span className={`pill ${doc.status}`}>{LABELS[doc.status]}</span>
      <button onClick={() => downloadFile(doc._id, doc.originalName).catch((e) => onError?.(e.message))}>
        Download
      </button>
    </div>
  );
}