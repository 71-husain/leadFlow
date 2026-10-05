import Document from "../models/Document.js";
import Lead from "../models/Lead.js";
import HttpError from "../utils/HttpError.js";
import { saveFile } from "./storage.js";
import { emitToBrokerage, emitToUser } from "../sockets/index.js";
import { enqueueDocumentCheck } from "../queues/documentQueue.js";
import { touchDashboard } from "./dashboardService.js";

const MAX_DOCS_PER_CASE = 50;

const findMyLead = (user) =>
  Lead.findOne({ brokerageId: user.brokerageId, clientUserId: user.id });

export const getClientCase = async (user) => {
  const lead = await findMyLead(user).select("name stage createdAt"); // only what a client should see
  if (!lead) throw new HttpError(404, "No case found");
  const documents = await Document.find({
    brokerageId: user.brokerageId,
    leadId: lead._id,
  }).sort({ createdAt: -1 });
  return { lead, documents };
};

export const uploadDocument = async (user, { file, type }) => {
  const lead = await findMyLead(user).select("_id");
  if (!lead) throw new HttpError(404, "No case found");

  const count = await Document.countDocuments({
    brokerageId: user.brokerageId,
    leadId: lead._id,
  });
  if (count >= MAX_DOCS_PER_CASE)
    throw new HttpError(422, `Limit of ${MAX_DOCS_PER_CASE} documents reached`);

  const fileId = await saveFile(file.buffer, file.originalname, {
    brokerageId: user.brokerageId,
  });
  const doc = await Document.create({
    brokerageId: user.brokerageId,
    leadId: lead._id,
    clientUserId: user.id,
    type,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    fileId,
  });

  touchDashboard(user.brokerageId);

  try {
    await enqueueDocumentCheck(doc);
  } catch (err) {
    // The file is saved and the upload still succeeds; the recovery sweep will queue it later
    console.error(
      "Could not queue check (recovery sweep will retry):",
      err.message,
    );
  }

  const payload = { document: doc.toJSON() };
  emitToBrokerage(user.brokerageId, "document:created", payload); // advisors see it live
  emitToUser(user.id, "document:created", payload); // and the client's other screens
  return doc;
};

export const listLeadDocuments = (brokerageId, leadId) =>
  Document.find({ brokerageId, leadId }).sort({ createdAt: -1 });
