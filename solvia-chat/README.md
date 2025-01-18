# Solvia Chat

A decentralized messaging and video calling platform built on the Solana blockchain.

## Features
- Secure peer-to-peer messaging with message status tracking
- Video and audio calling using WebRTC
- Solana wallet integration for secure authentication
- Modern UI built with React, TypeScript, and shadcn/ui

## Prerequisites
- Node.js v16+
- Solana wallet (e.g., Phantom)
- Modern web browser with WebRTC support

## Installation
1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Project Structure
```
src/
├── components/     # React components
│   ├── ui/        # Reusable UI components
│   └── ...        # Feature-specific components
├── lib/           # Utility functions and hooks
└── App.tsx        # Main application component
```

## Related Projects
This is part of the [Solvia](../) ecosystem, which includes:
- [solvia-metadata-update](../solvia-metadata-update): Tool for updating Solana token metadata

## Deployment
For production deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).
