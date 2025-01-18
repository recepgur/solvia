# Solvia Metadata Update Tool

A tool for updating Solana token metadata.

## Features
- Update token metadata on Solana blockchain
- Integration with Metaplex
- Support for updating name, symbol, and URI
- Automatic JSON metadata handling

## Prerequisites
- Node.js
- Solana CLI tools
- Configured Solana wallet (keypair at `~/.config/solana/id.json`)

## Environment Variables
Copy `.env.example` to `.env` and configure:
```bash
# Required
TOKEN_MINT_ADDRESS=your_token_mint_address_here
METADATA_URI=your_metadata_uri_here

# Optional (defaults to mainnet-beta)
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Keypair Configuration
The tool expects your Solana keypair at: `/home/ubuntu/.config/solana/id.json`
To use a different location, modify the path in `update_token.js`.

## Installation
```bash
npm install
```

## Usage
1. Configure your Solana wallet
2. Update metadata.json with desired changes
3. Run the update script:
```bash
node update_token.js
```

## Configuration
The tool uses the following files:
- `metadata.json`: Contains token metadata
- `update_token.js`: Main script for updating token metadata

## Related Projects
This is part of the Solvia ecosystem, which includes a decentralized chat platform.
