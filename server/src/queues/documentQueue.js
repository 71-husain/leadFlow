import { Queue } from 'bullmq';
import { createRedis } from '../config/redis.js';

export const DOCUMENT_QUEUE = 'document-checks';

let queue;
const getQueue = () => {
  if (!queue) {
    queue = new Queue(DOCUMENT_QUEUE, {
      connection: createRedis(),
      defaultJobOptions: {
        attempts: 3,                                      // try up to 3 times
        backoff: { type: 'exponential', delay: 2000 },    // wait 2s, then 4s between tries
        removeOnComplete: { age: 3600, count: 1000 },     // keep Redis small
        removeOnFail: { age: 24 * 3600 },
      },
    });
  }
  return queue;
};

// If Redis is unreachable, adding a job could hang forever. Give up after 3 seconds instead.
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Queue unavailable')), ms)),
  ]);

export const enqueueDocumentCheck = (document) =>
  withTimeout(
    getQueue().add(
      'check',
      { documentId: String(document._id), brokerageId: String(document.brokerageId) },
      { jobId: String(document._id) } // same document = same job id, so duplicates are ignored
    ),
    3000
  );