const express = require('express');
const { startP2PNetwork } = require('./communication/p2p-network');
const { initializeWebRTC } = require('./communication/webrtc-manager');
const { initializeIPFS } = require('./storage/ipfs-manager');
const { initializeBlockchain } = require('./blockchain/blockchain-node');
const { initializeIdentity } = require('./identity/identity-manager');

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
