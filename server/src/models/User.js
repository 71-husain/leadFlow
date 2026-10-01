import mongoose from 'mongoose';

export const ROLES = ['platform_admin', 'brokerage_admin', 'advisor', 'client'];

const userSchema = new mongoose.Schema(
  {
    brokerageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brokerage', index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);