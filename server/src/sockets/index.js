import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || '*' },
  });

  // Runs once per connection attempt: reject anyone without a valid token
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Not authenticated'));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (!user || !user.isActive) return next(new Error('Not authenticated'));

      socket.data.user = {
        id: user._id.toString(),
        role: user.role,
        brokerageId: user.brokerageId ? user.brokerageId.toString() : null,
        name: user.name,
      };
      next();
    } catch {
      next(new Error('Not authenticated'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, brokerageId } = socket.data.user;

    // Rooms are decided by the SERVER from the verified user. There is no
    // "join room" event, so a client cannot ask to enter someone else's room.
    socket.join(`user:${id}`);
    if (brokerageId && (role === 'brokerage_admin' || role === 'advisor')) {
      socket.join(`brokerage:${brokerageId}`);
    }
  });

  return io;
};

// "?." means: if sockets aren't running (like in a script), do nothing instead of crashing
export const emitToBrokerage = (brokerageId, event, payload) => {
  io?.to(`brokerage:${brokerageId}`).emit(event, payload);
};

export const emitToUser = (userId, event, payload) => {
  io?.to(`user:${userId}`).emit(event, payload);
};