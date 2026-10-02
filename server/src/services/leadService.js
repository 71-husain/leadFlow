import Lead from '../models/Lead.js';

export const normalizePhone = (phone) => (phone ? phone.replace(/[^\d+]/g, '') : undefined);

// "Do we already know this person?" Always scoped to ONE brokerage.
export const findExistingPerson = async (brokerageId, { email, phoneNormalized }) => {
  const or = [];
  if (email) or.push({ email });
  if (phoneNormalized) or.push({ phoneNormalized });
  if (or.length === 0) return null;

  return Lead.findOne({ brokerageId, $or: or }).sort({ createdAt: 1 });
};