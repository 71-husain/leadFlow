import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';
import { STAGES } from '../utils/constants.js';

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    phoneNormalized: { type: String, index: true },
    source: { type: String, required: true },      // e.g. "tally"
    externalId: { type: String },                  // the source tool's id for this submission
    stage: { type: String, enum: STAGES, default: 'new', index: true },
    version: { type: Number, default: 0 },         // used for safe concurrent moves in Step 4
    assignedAdvisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    clientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    rawPayload: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

leadSchema.plugin(tenantPlugin); // adds required brokerageId + the safety net

// Idempotency: one lead per (brokerage, source, externalId)
leadSchema.index(
  { brokerageId: 1, source: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: 'string' } } }
);
// Fast duplicate-person lookups
leadSchema.index({ brokerageId: 1, email: 1 });

leadSchema.index({ brokerageId: 1, clientUserId: 1 });

export default mongoose.model('Lead', leadSchema);