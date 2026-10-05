import Document from '../models/Document.js';
import { enqueueDocumentCheck } from './documentQueue.js';

// Every minute: any document still "pending" for over a minute probably has no job
// (Redis was down, or its data was lost). Queue it again. Duplicate job ids are ignored.
export const startRecoverySweep = () => {
  const sweep = async () => {
    try {
      const stuck = await Document.find({
        status: 'pending',
        updatedAt: { $lt: new Date(Date.now() - 60_000) },
      })
        .setOptions({ skipTenantCheck: true }) // a system-wide job, deliberately across all brokerages
        .limit(100);

      for (const doc of stuck) await enqueueDocumentCheck(doc);
      if (stuck.length) console.log(`[sweep] re-queued ${stuck.length} document(s)`);
    } catch (err) {
      console.error('[sweep] failed:', err.message);
    }
  };

  sweep();
  setInterval(sweep, 60_000);
};