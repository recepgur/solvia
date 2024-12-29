import express from 'express';
import client from 'prom-client';

// Create a Registry to register metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'solvia-blockchain'
});

// Create metrics
const blockTime = new client.Gauge({
  name: 'blockchain_block_time_seconds',
  help: 'Time between blocks in seconds',
  labelNames: ['node_id']
});

const syncStatus = new client.Gauge({
  name: 'blockchain_sync_status',
  help: 'Node synchronization status (1 = synced, 0 = not synced)',
  labelNames: ['node_id']
});

const activeConnections = new client.Gauge({
  name: 'blockchain_active_connections',
  help: 'Number of active peer connections',
  labelNames: ['node_id']
});

const transactionCount = new client.Counter({
  name: 'blockchain_transaction_count_total',
  help: 'Total number of processed transactions',
  labelNames: ['node_id', 'status']
});

// Register metrics
register.registerMetric(blockTime);
register.registerMetric(syncStatus);
register.registerMetric(activeConnections);
register.registerMetric(transactionCount);

// Create Express app
const app = express();

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Import blockchain node
import { getNodeStatus } from '../blockchain/blockchain-node.js';

// Update metrics with real blockchain data
setInterval(async () => {
  try {
    const nodeStatus = await getNodeStatus();
    blockTime.set({ node_id: nodeStatus.nodeId }, nodeStatus.lastBlockTime);
    syncStatus.set({ node_id: nodeStatus.nodeId }, nodeStatus.isSynced ? 1 : 0);
    activeConnections.set({ node_id: nodeStatus.nodeId }, nodeStatus.peerCount);
    
    // Update transaction count if new transactions were processed
    if (nodeStatus.newTransactions > 0) {
      transactionCount.inc({ node_id: nodeStatus.nodeId, status: 'success' }, nodeStatus.newTransactions);
    }
  } catch (error) {
    console.error('Error updating metrics:', error);
  }
}, 5000);

// Start server
const port = process.env.METRICS_PORT || 9464;
app.listen(port, () => {
  console.log(`Metrics server listening on port ${port}`);
});
