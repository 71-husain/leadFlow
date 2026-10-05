import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import User from '../models/User.js';
import HttpError from '../utils/HttpError.js';
import { getLead } from './leadService.js';
import { emitToBrokerage } from '../sockets/index.js';
import { touchDashboard } from './dashboardService.js';

export const convertLeadToClient = async (brokerageId, leadId) => {
  const lead = await getLead(brokerageId, leadId); // 404 for unknown or other brokerages' ids
  if (lead.clientUserId) throw new HttpError(409, 'Lead is already a client');
  if (!lead.email) throw new HttpError(422, 'Lead needs an email address to become a client');

  const temporaryPassword = crypto.randomBytes(9).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const session = await mongoose.startSession();
  let updated;
  try {
    // A transaction: either BOTH the lead link and the user are saved, or NEITHER
    await session.withTransaction(async () => {
      const clientUserId = new mongoose.Types.ObjectId();

      // "Claim" the lead only if nobody has converted it yet (two advisors clicking at once)
      updated = await Lead.findOneAndUpdate(
        { _id: lead._id, brokerageId, clientUserId: null },
        { $set: { clientUserId }, $inc: { version: 1 } },
        { returnDocument: 'after', session }
      ).select('-rawPayload');
      if (!updated) throw new HttpError(409, 'Lead is already a client');

      await User.create(
        [{ _id: clientUserId, brokerageId, name: lead.name, email: lead.email, passwordHash, role: 'client' }],
        { session }
      );
    });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, 'A user with this email already exists');
    throw err;
  } finally {
    await session.endSession();
  }

  emitToBrokerage(brokerageId, 'lead:updated', { lead: updated.toJSON() });
  touchDashboard(brokerageId);
  return { lead: updated, credentials: { email: lead.email, temporaryPassword } };
};