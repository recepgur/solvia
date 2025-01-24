# TChat Installation Guide

## Prerequisites

### Backend Requirements
- Python 3.9 or higher
- Poetry (Python package manager)
- PostgreSQL
- IPFS node (for media storage)

### Frontend Requirements
- Node.js 16 or higher
- Yarn package manager
- React Native development environment
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Blockchain Requirements
- Solana CLI tools
- Anchor Framework
- Phantom Wallet

## Installation Steps

### 1. Backend Setup

```bash
# Navigate to backend directory
cd app

# Install dependencies using Poetry
poetry install

# Set up environment variables
export SOLANA_NETWORK=devnet
export IPFS_GATEWAY=http://localhost:5001

# Start the backend server
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd mobile

# Install dependencies
yarn install

# Set up environment variables (already configured in .env)
# REACT_APP_API_URL=http://localhost:8000
# REACT_APP_WS_URL=ws://localhost:8000/ws
# REACT_APP_SOLANA_NETWORK=devnet
# REACT_APP_IPFS_GATEWAY=http://localhost:5001

# Start the development server
yarn start

# Run on Android
yarn android

# Run on iOS (macOS only)
yarn ios
```

### 3. Smart Contract Setup

```bash
# Navigate to contracts directory
cd contracts

# Build the smart contracts
anchor build

# Deploy to devnet (make sure you have Solana CLI configured for devnet)
anchor deploy
```

## Configuration Details

### Backend Configuration
The backend server requires the following environment variables:
- `SOLANA_NETWORK`: Solana network to connect to (default: devnet)
- `IPFS_GATEWAY`: IPFS gateway URL for media storage

### Frontend Configuration
The frontend app uses the following environment variables (configured in `.env`):
- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_WS_URL`: WebSocket URL for real-time messaging
- `REACT_APP_SOLANA_NETWORK`: Solana network configuration
- `REACT_APP_IPFS_GATEWAY`: IPFS gateway URL

### Smart Contract Configuration
Smart contract deployment requires:
- Solana CLI configured for the target network
- Anchor.toml configured with correct program ID and network

## Troubleshooting

### Common Issues

1. Backend Connection Issues
   - Verify PostgreSQL is running
   - Check IPFS node connection
   - Ensure correct environment variables are set

2. Frontend Build Issues
   - Clear yarn cache: `yarn cache clean`
   - Remove node_modules: `rm -rf node_modules && yarn install`
   - Check React Native environment setup

3. Smart Contract Deployment Issues
   - Verify Solana CLI configuration
   - Check account balance for deployment
   - Ensure Anchor.toml is properly configured

## Development Notes

- The backend API documentation is available at `http://localhost:8000/docs`
- WebSocket connections are used for real-time messaging
- Smart contracts handle message storage and verification on Solana
- IPFS is used for media storage (images, voice messages, etc.)
