import 'dotenv/config';
import { io } from 'socket.io-client';

const [email = 'advisor@alpha.test', mode = 'good'] = process.argv.slice(2);
const base = `http://localhost:${process.env.PORT || 5000}`;

const res = await fetch(`${base}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: 'Password123!' }),
});
const { token } = await res.json();

const socket = io(base, { auth: { token: mode === 'bad' ? 'garbage' : token } });

socket.on('connect', () => console.log(`[${email}] connected`));
socket.on('connect_error', (err) => console.log(`[${email}] connect_error:`, err.message));
socket.on('disconnect', () => console.log(`[${email}] disconnected`));
socket.onAny((event, payload) => console.log(`[${email}] EVENT ${event}`, JSON.stringify(payload, null, 2)));