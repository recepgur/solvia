import { Server, Socket } from 'socket.io';
import { getRedisClient } from './redis';
import { verifyMessage } from './auth';

export async function setupWebSocket(io: Server) {
  io.use(async (socket, next) => {
    const { publicKey } = socket.handshake.auth;
    if (!publicKey) {
      return next(new Error('Authentication error'));
    }
    socket.data.publicKey = publicKey;
    next();
  });

  io.on('connection', async (socket: Socket) => {
    console.log('Client connected:', socket.id);
    
    const redis = getRedisClient();
    await redis.set(`user:${socket.data.publicKey}:socket`, socket.id);
    await redis.set(`user:${socket.data.publicKey}:status`, 'online');

    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      await redis.del(`user:${socket.data.publicKey}:socket`);
      await redis.set(`user:${socket.data.publicKey}:status`, 'offline');
    });

    // Handle WebRTC signaling
    socket.on('call:signal', async (data) => {
      const recipientSocket = await redis.get(`user:${data.recipient}:socket`);
      if (recipientSocket) {
        io.to(recipientSocket).emit('call:signal', {
          ...data,
          caller: socket.data.publicKey,
        });
      }
    });

    // Handle call events
    socket.on('call:start', async (data) => {
      const recipientSocket = await redis.get(`user:${data.recipient}:socket`);
      if (recipientSocket) {
        io.to(recipientSocket).emit('call:incoming', {
          ...data,
          caller: socket.data.publicKey,
        });
      }
    });
  });
}
