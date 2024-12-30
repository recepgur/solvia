// Solvia Platform Configuration
export default {
    // Network configuration
    port: process.env.PORT || 5001,
    host: process.env.HOST || '0.0.0.0',
    
    // Blockchain configuration
    blockchain: {
        solanaRPC: 'https://api.mainnet-beta.solana.com',
        solvioTokenMint: '7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ',
        validatorCount: 21,
        minStake: 100000,
        blockTime: 3000,
        commitment: 'confirmed'
    },
    
    // WebSocket configuration
    websocket: {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    },
    
    // IPFS configuration
    ipfs: {
        host: 'ipfs.io',
        port: 443,
        protocol: 'https',
        apiPath: '/api/v0'
    },

    // Authentication configuration
    auth: {
        supportedWallets: ['phantom', 'metamask'],
        requiredNetwork: 'mainnet'
    },

    // WebRTC configuration
    webrtc: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ],
        maxRetries: 3,
        timeout: 30000
    }
};
