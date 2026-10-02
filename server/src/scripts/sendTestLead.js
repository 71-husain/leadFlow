import 'dotenv/config';
import dns from 'node:dns';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Brokerage from '../models/Brokerage.js';

if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(','));

const [slug = 'alpha', responseId = 'resp_1', email = 'anna@example.com',
  name = 'Anna Schmidt', phone = '+49 151 1234567'] = process.argv.slice(2);

await mongoose.connect(process.env.MONGO_URI);
const brokerage = await Brokerage.findOne({ slug });
await mongoose.disconnect();
if (!brokerage) throw new Error(`No brokerage with slug "${slug}"`);

const body = JSON.stringify({
  eventId: `evt_${responseId}`,
  eventType: 'FORM_RESPONSE',
  data: {
    responseId,
    fields: [
      { key: 'q1', label: 'Full name', type: 'INPUT_TEXT', value: name },
      { key: 'q2', label: 'Email', type: 'INPUT_EMAIL', value: email },
      { key: 'q3', label: 'Phone number', type: 'INPUT_PHONE_NUMBER', value: phone },
    ],
  },
});

const signature = crypto.createHmac('sha256', brokerage.webhookSecret).update(body).digest('base64');

const res = await fetch(`http://localhost:${process.env.PORT || 5000}/api/webhooks/tally/${slug}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'tally-signature': signature },
  body,
});

console.log(res.status, await res.json());