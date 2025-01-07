# Decentralized Blockchain Messenger

A fully decentralized communication platform built with blockchain technology, enabling secure messaging, voice calls, and video calls.

## Features

- Decentralized communication network
- Wallet-based authentication
- End-to-end encrypted messaging
- Voice and video calls
- WhatsApp-like user interface
- Blockchain-based message storage
- Peer-to-peer communication

## Technology Stack

- Frontend: Next.js + React
- Styling: Tailwind CSS + Chakra UI
- Blockchain Integration: ethers.js + Web3Modal
- P2P Communication: Simple-peer
- Real-time Updates: Socket.io
- Authentication: Wallet Connect
- Smart Contracts: Solidity + Hardhat

## Project Structure

```
blockchain-messenger/
├── contracts/         # Smart contract source files
├── scripts/          # Deployment and test scripts
├── test/            # Smart contract test files
├── src/
│   ├── app/         # Next.js app directory
│   ├── components/  # React components
│   ├── services/    # Backend services
│   ├── utils/       # Utility functions
│   └── artifacts/   # Compiled contract artifacts
└── public/          # Static assets
```

## Development Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Configure environment variables in `.env.local`:
- Set `NEXT_PUBLIC_WEB3MODAL_PROJECT_ID` for wallet integration
- Configure `NEXT_PUBLIC_RPC_URL` for blockchain network
- Add other required environment variables

4. Compile smart contracts:
```bash
pnpm hardhat compile
```

5. Run local blockchain network:
```bash
pnpm hardhat node
```

6. Deploy contracts (in a new terminal):
```bash
pnpm hardhat run scripts/deploy.ts --network localhost
```

7. Run the development server:
```bash
pnpm dev
```

## Smart Contracts

The project uses smart contracts for:
- User authentication and profiles
- Encrypted message storage
- Call signaling
- User data management

### Contract Testing
```bash
pnpm hardhat test
```

### Contract Deployment
```bash
pnpm hardhat run scripts/deploy.ts --network <network-name>
```

## Security Features

- End-to-end encryption for messages
- Decentralized storage using IPFS
- Wallet-based authentication
- P2P communication for calls
- Smart contract security measures:
  - ReentrancyGuard
  - Access control
  - Input validation
