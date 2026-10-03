import crypto from "node:crypto";
import Brokerage from "../models/Brokerage.js";
import Lead from "../models/Lead.js";
import { findExistingPerson, normalizePhone } from "../services/leadService.js";
import { emitToBrokerage, emitToUser } from "../sockets/index.js";

const verifySignature = (rawBody, signature, secret) => {
  if (!rawBody || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Tally sends fields as [{ key, label, type, value }]. Find by a keyword in the label.
const pick = (fields, keyword) => {
  const f = fields.find(
    (x) => x.label && x.label.toLowerCase().includes(keyword),
  );
  return f && f.value != null ? String(f.value).trim() : undefined;
};

export const receiveTallyLead = async (req, res) => {
  // 1. Who is this for, and is the signature valid?
  // Unknown brokerage and bad signature both return 401, so nobody can probe which slugs exist.
  const brokerage = await Brokerage.findOne({
    slug: req.params.slug,
    isActive: true,
  });
  const valid =
    brokerage &&
    verifySignature(
      req.rawBody,
      req.get("tally-signature"),
      brokerage.webhookSecret,
    );
  if (!valid) return res.status(401).json({ message: "Invalid signature" });

  // 2. Ignore events we don't care about (still answer 200 so Tally doesn't retry)
  const payload = req.body;
  if (payload.eventType !== "FORM_RESPONSE") return res.json({ ignored: true });

  const fields = payload.data?.fields || [];
  const externalId = payload.data?.responseId;
  const name = pick(fields, "name");
  const email = pick(fields, "email")?.toLowerCase();
  const phone = pick(fields, "phone");

  if (!externalId || !name || (!email && !phone)) {
    return res
      .status(422)
      .json({ message: "Missing name, contact info or response id" });
  }

  // 3. Do we already know this person? (flag, don't reject)
  const phoneNormalized = normalizePhone(phone);
  const existing = await findExistingPerson(brokerage._id, {
    email,
    phoneNormalized,
  });

  // 4. Create. The unique index makes a repeated delivery impossible to duplicate.
  try {
    const lead = await Lead.create({
      brokerageId: brokerage._id,
      name,
      email,
      phone,
      phoneNormalized,
      source: "tally",
      externalId,
      duplicateOf: existing ? existing._id : null,
      rawPayload: payload,
    });

    const { rawPayload, ...leadData } = lead.toObject(); // never broadcast the raw payload
    emitToBrokerage(brokerage._id, "lead:created", { lead: leadData });
    return res
      .status(201)
      .json({ id: lead._id, duplicateOf: lead.duplicateOf });
  } catch (err) {
    if (err.code === 11000) {
      // Same delivery arrived twice (retry or race). Not an error: acknowledge it.
      return res.json({ duplicateDelivery: true });
    }
    throw err;
  }
};
