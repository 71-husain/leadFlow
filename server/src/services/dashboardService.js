import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import Document from '../models/Document.js';
import { getRedis } from '../config/redis.js';
import { emitToBrokerage } from '../sockets/index.js';
import { STAGES } from '../utils/constants.js';

const verKey = (id) => `dash:ver:${id}`;
const dataKey = (id, ver) => `dash:data:${id}:${ver}`;

// The cache must never break the dashboard: if Redis is slow or down, give up quickly and compute directly
const safe = (promise, ms = 500) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]).catch(() => null);

// Call this whenever something the dashboard shows has changed
export const touchDashboard = async (brokerageId) => {
  const id = String(brokerageId);
  await safe(getRedis().incr(verKey(id))); // old cached copies become unreachable
  emitToBrokerage(id, 'dashboard:changed', {});
};

const compute = async (brokerageId) => {
  console.log('[dashboard] computing from database');
  // aggregate() does NOT cast ids and is NOT covered by the tenant guard, so we cast and $match first
  const bid = new mongoose.Types.ObjectId(brokerageId);
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [leadAgg, docRows] = await Promise.all([
    Lead.aggregate([
      { $match: { brokerageId: bid } },
      {
        $facet: {
          byStage: [{ $group: { _id: '$stage', count: { $sum: 1 } } }],
          clients: [{ $match: { clientUserId: { $ne: null } } }, { $count: 'n' }],
          duplicates: [{ $match: { duplicateOf: { $ne: null } } }, { $count: 'n' }],
          lastWeek: [{ $match: { createdAt: { $gte: weekAgo } } }, { $count: 'n' }],
        },
      },
    ]),
    Document.aggregate([
      { $match: { brokerageId: bid } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const f = leadAgg[0];
  const byStage = Object.fromEntries(STAGES.map((s) => [s, 0]));
  f.byStage.forEach((r) => { byStage[r._id] = r.count; });
  const documents = { pending: 0, checking: 0, verified: 0, failed: 0 };
  docRows.forEach((r) => { documents[r._id] = r.count; });

  const closed = byStage.won + byStage.lost;
  return {
    totals: {
      leads: Object.values(byStage).reduce((a, b) => a + b, 0),
      clients: f.clients[0]?.n ?? 0,
      duplicates: f.duplicates[0]?.n ?? 0,
      newLast7Days: f.lastWeek[0]?.n ?? 0,
    },
    byStage,
    documents,
    winRate: closed ? Math.round((byStage.won / closed) * 100) : null,
    generatedAt: new Date().toISOString(),
  };
};

export const getDashboard = async (brokerageId) => {
  const id = String(brokerageId);
  const redis = getRedis();

  const ver = (await safe(redis.get(verKey(id)))) ?? '0';
  const cached = await safe(redis.get(dataKey(id, ver)));
  if (cached) return { ...JSON.parse(cached), cached: true };

  const data = await compute(id);
  // The 60-second expiry is only a safety net for the rare case a version bump was lost
  await safe(redis.set(dataKey(id, ver), JSON.stringify(data), 'EX', 60));
  return { ...data, cached: false };
};