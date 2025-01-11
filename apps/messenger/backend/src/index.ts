import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { Connection } from '@solana/web3.js';
import { setupWebSocket } from './services/websocket';
import { setupMonitoring } from './services/monitoring';
import { setupRedis } from './services/redis';
import { setupMongoDB } from './services/mongodb';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Solana connection
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');

// Setup services
setupMongoDB().catch(console.error);
setupRedis().catch(console.error);
setupWebSocket(io).catch(console.error);
setupMonitoring(app).catch(console.error);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Starting graceful shutdown...');
  await mongoose.disconnect();
  process.exit(0);
});
