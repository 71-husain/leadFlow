import Lead from "../models/Lead.js";
import mongoose from "mongoose";
import HttpError from "../utils/HttpError.js";
import { emitToBrokerage } from "../sockets/index.js";

export const normalizePhone = (phone) =>
  phone ? phone.replace(/[^\d+]/g, "") : undefined;

// "Do we already know this person?" Always scoped to ONE brokerage.
export const findExistingPerson = async (
  brokerageId,
  { email, phoneNormalized },
) => {
  const or = [];
  if (email) or.push({ email });
  if (phoneNormalized) or.push({ phoneNormalized });
  if (or.length === 0) return null;

  return Lead.findOne({ brokerageId, $or: or }).sort({ createdAt: 1 });
};

export const listLeads = (brokerageId, { stage } = {}) => {
  const filter = { brokerageId };
  if (stage) filter.stage = stage;
  return Lead.find(filter)
    .select("-rawPayload")
    .sort({ updatedAt: -1 })
    .limit(200);
};

export const getLead = async (brokerageId, id) => {
  // A malformed id and someone else's id must look identical: 404
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, "Lead not found");
  const lead = await Lead.findOne({ _id: id, brokerageId });
  if (!lead) throw new HttpError(404, "Lead not found");
  return lead;
};

export const moveLeadStage = async (
  brokerageId,
  id,
  { stage, version },
  actor,
) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, "Lead not found");

  // One atomic operation: "update it only if it's still the version I saw"
  const updated = await Lead.findOneAndUpdate(
    { _id: id, brokerageId, version },
    { $set: { stage }, $inc: { version: 1 } },
    { returnDocument: 'after' },
  ).select("-rawPayload");

  // if updated then broadcast it to live
  if (updated) {    
    emitToBrokerage(brokerageId, "lead:moved", {
      lead: updated.toJSON(),
      movedBy: actor ? { id: actor.id, name: actor.name } : null,
    });
    return updated;
  }
  // No match: either it doesn't exist (for this brokerage) or someone changed it first
  const current = await Lead.findOne({ _id: id, brokerageId }).select(
    "-rawPayload",
  );
  if (!current) throw new HttpError(404, "Lead not found");
  throw new HttpError(409, "Lead was changed by someone else", {
    lead: current,
  });
};
