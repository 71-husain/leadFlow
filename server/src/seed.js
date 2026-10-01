import dns from 'node:dns';
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(','));
}

import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Brokerage from './models/Brokerage.js';
import User from './models/User.js';

const PASSWORD = 'Password123!';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([Brokerage.deleteMany({}), User.deleteMany({})]);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await User.create({ name: 'Platform Admin', email: 'platform@leadflow.test', passwordHash, role: 'platform_admin' });

  for (const [name, slug] of [['Alpha Mortgages', 'alpha'], ['Beta Finance', 'beta']]) {
    const b = await Brokerage.create({ name, slug, webhookSecret: crypto.randomBytes(16).toString('hex') });
    await User.create([
      { brokerageId: b._id, name: `${name} Admin`, email: `admin@${slug}.test`, passwordHash, role: 'brokerage_admin' },
      { brokerageId: b._id, name: `${name} Advisor`, email: `advisor@${slug}.test`, passwordHash, role: 'advisor' },
    ]);
  }

  console.log('Seeded. Password for all users:', PASSWORD);
  await mongoose.disconnect();
};

run();