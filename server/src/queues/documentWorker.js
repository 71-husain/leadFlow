import { Worker } from 'bullmq';
import Document from '../models/Document.js';
import { createRedis } from '../config/redis.js';
import { DOCUMENT_QUEUE } from './documentQueue.js';
import { emitToBrokerage, emitToUser } from '../sockets/index.js';
import { touchDashboard } from '../services/dashboardService.js';

const FAIL_RATE = Number(process.env.CHECK_FAIL_RATE ?? 0.3);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Tell the advisors of this brokerage and the owning client, live
const publish = (doc) => {
  touchDashboard(doc.brokerageId.toString());
  const payload = { document: doc.toJSON() };
  emitToBrokerage(doc.brokerageId.toString(), 'document:updated', payload);
  emitToUser(doc.clientUserId.toString(), 'document:updated', payload);
};

const processCheck = async (job) => {
  const { documentId, brokerageId } = job.data;

  // Mark as checking. If the document is gone or already verified, there is nothing to do.
  // This makes the job SAFE TO RUN TWICE, which matters if a worker crashes mid-job.
  const doc = await Document.findOneAndUpdate(
    { _id: documentId, brokerageId, status: { $in: ['pending', 'checking', 'failed'] } },
    { $set: { status: 'checking', failureReason: null }, $inc: { attempts: 1 } },
    { returnDocument: 'after' }
  );
  if (!doc) return;
  console.log(`[check] ${documentId} started (attempt ${job.attemptsMade + 1})`);
  publish(doc);

  await sleep(5000 + Math.random() * 10000); // the slow, fake check: 5 to 15 seconds

  if (Math.random() < FAIL_RATE) throw new Error('Document unreadable (simulated)');

  const verified = await Document.findOneAndUpdate(
    { _id: documentId, brokerageId },
    { $set: { status: 'verified' } },
    { returnDocument: 'after' }
  );
  console.log(`[check] ${documentId} verified`);
  publish(verified);
};

export const startDocumentWorker = () => {
  const worker = new Worker(DOCUMENT_QUEUE, processCheck, {
    connection: createRedis(),
    concurrency: 3, // at most 3 documents checked at the same time
  });

  // Runs whenever an attempt throws. BullMQ will retry unless attempts are used up.
  worker.on('failed', async (job, err) => {
    if (!job) return;
    const finalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
    console.log(`[check] ${job.data.documentId} failed (${finalAttempt ? 'final' : 'will retry'}): ${err.message}`);
    const doc = await Document.findOneAndUpdate(
      { _id: job.data.documentId, brokerageId: job.data.brokerageId },
      { $set: { status: finalAttempt ? 'failed' : 'pending', failureReason: err.message } },
      { returnDocument: 'after' }
    );
    if (doc) publish(doc);
  });

  worker.on('error', (err) => console.error('Worker error:', err.message));
  console.log('Document worker started');
  return worker;
};