import express from 'express';
import { startP2PNetwork } from './communication/p2p-network.js';
import { initializeWebRTC } from './communication/webrtc-manager.js';
import { initializeIPFS } from './storage/ipfs-manager.js';
import { initializeBlockchain } from './blockchain/blockchain-node.js';
import { initializeIdentity } from './identity/identity-manager.js';

const app = express();
const port = process.env.PORT || 3000;

// Initialize middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    // Initialize core components
    await Promise.all([
      startP2PNetwork(),
      initializeWebRTC(),
      initializeIPFS(),
      initializeBlockchain(),
      initializeIdentity()
    ]);

    // Start HTTP server
    app.listen(port, '0.0.0.0', () => {
      console.log(`Solvia communication platform running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
