import dns from 'node:dns';
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(','));
}

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const start = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
  app.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`)
  );
};

start().catch((err) => {
  console.error('Failed to start', err);
  process.exit(1);
});