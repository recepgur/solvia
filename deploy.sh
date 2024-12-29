#!/bin/bash

echo "Starting deployment process..."

# Ensure Node.js 20.x is installed
if ! command -v node &> /dev/null || [[ $(node -v) != v20* ]]; then
    echo "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Create project structure
mkdir -p /root/solvia/src/{blockchain,communication,contracts,identity,storage}

# Initialize package.json
cat > /root/solvia/package.json << 'EOL'
{
  "name": "solvia",
  "version": "1.0.0",
  "description": "Decentralized Communication Platform with Cross-Chain Support",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "libp2p": "^1.0.0",
    "@libp2p/bootstrap": "^9.0.0",
    "@libp2p/tcp": "^8.0.0",
    "@libp2p/websockets": "^7.0.0",
    "@libp2p/noise": "^12.0.1",
    "@libp2p/mplex": "^9.0.0",
    "@chainsafe/libp2p-gossipsub": "^11.0.0",
    "@libp2p/kad-dht": "^11.0.0",
    "@libp2p/peer-id": "^3.0.0",
    "@libp2p/peer-id-factory": "^3.0.0",
    "@solana/web3.js": "1.87.6",
    "ethers": "6.9.0",
    "web3": "4.3.0",
    "express": "4.18.2",
    "cors": "2.8.5",
    "dotenv": "16.3.1",
    "socket.io": "4.7.2",
    "ipfs-http-client": "60.0.1"
  }
}
EOL

# Install all dependencies at once
cd /root/solvia
echo "Installing dependencies..."
npm install --legacy-peer-deps --no-audit --no-fund || exit 1

# Create core files
echo "Creating core files..."

# P2P Network
cat > /root/solvia/src/communication/p2p-network.js << 'EOL'
import { createLibp2p } from 'libp2p'
import { noise } from '@libp2p/noise'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { tcp } from '@libp2p/tcp'
import { webSockets } from '@libp2p/websockets'
import { mplex } from '@libp2p/mplex'
import { bootstrap } from '@libp2p/bootstrap'
import { kadDHT } from '@libp2p/kad-dht'

export async function startP2PNode() {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/6000']
    },
    transports: [tcp(), webSockets()],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    peerDiscovery: [
      bootstrap({
        list: [
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
        ]
      })
    ],
    services: {
      dht: kadDHT(),
      pubsub: gossipsub()
    }
  })

  await node.start()
  console.log('P2P node started successfully')
  return node
}
EOL

# Create blockchain integration file
cat > /root/solvia/src/blockchain/blockchain-node.js << 'EOL'
import { Connection, PublicKey } from '@solana/web3.js'
import { ethers } from 'ethers'
import Web3 from 'web3'

export class BlockchainNode {
  constructor() {
    this.solanaConnection = new Connection('https://api.mainnet-beta.solana.com')
    this.ethereumProvider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR-PROJECT-ID')
    this.web3 = new Web3('https://mainnet.infura.io/v3/YOUR-PROJECT-ID')
  }

  async init() {
    try {
      await this.solanaConnection.getVersion()
      console.log('Connected to Solana network')
      
      const ethBlock = await this.ethereumProvider.getBlockNumber()
      console.log('Connected to Ethereum network, current block:', ethBlock)
      
      return true
    } catch (error) {
      console.error('Failed to initialize blockchain connections:', error)
      return false
    }
  }
}
EOL

# Create main index.js
cat > /root/solvia/src/index.js << 'EOL'
import { startP2PNode } from './communication/p2p-network.js'
import { BlockchainNode } from './blockchain/blockchain-node.js'
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

async function startServer() {
  try {
    const node = await startP2PNode()
    const blockchainNode = new BlockchainNode()
    await blockchainNode.init()
    
    console.log('Solvia node started successfully')
    
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        peerId: node.peerId.toString(),
        p2pStatus: node.isStarted() ? 'connected' : 'disconnected'
      })
    })
    
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
EOL

echo "Deployment script completed"
