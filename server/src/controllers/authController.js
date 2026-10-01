import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const login = async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const { email, password } = parsed.data;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  const ok = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

  const token = jwt.sign(
    { id: user._id, role: user.role, brokerageId: user.brokerageId || null },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, brokerageId: user.brokerageId },
  });
};

export const me = (req, res) => res.json({ user: req.user });