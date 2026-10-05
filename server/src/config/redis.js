import IORedis from 'ioredis';

// BullMQ requires maxRetriesPerRequest: null because workers use long blocking commands
export const createRedis = () => {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not set');
  const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  connection.on('error', (err) => console.error('Redis error:', err.message));
  return connection;
};

let shared;
export const getRedis = () => (shared ||= createRedis()); // one connection reused for caching