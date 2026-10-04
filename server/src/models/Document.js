import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';

export const DOC_TYPES = ['payslip', 'id', 'bank_statement', 'other'];
export const DOC_STATUSES = ['pending', 'checking', 'verified', 'failed'];

const documentSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    clientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: DOC_TYPES, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true }, // points at the stored file
    status: { type: String, enum: DOC_STATUSES, default: 'pending', index: true },
    failureReason: String, // used by tomorrow's checker
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

documentSchema.plugin(tenantPlugin); // same safety net as leads
documentSchema.index({ brokerageId: 1, leadId: 1, createdAt: -1 });

export default mongoose.model('Document', documentSchema);