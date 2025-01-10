# Solvio Blockchain

A specialized blockchain network optimized for decentralized communication, implementing a Delegated Proof of Stake (DPoS) consensus mechanism with real-time message prioritization.

## Features

- Three-tier node architecture (Message Routing, Storage, and Validator nodes)
- Sub-second block finality with 0.5s block time
- Message type-aware transaction prioritization
- Sharded message storage with SQLite
- Comprehensive test coverage with pytest

## Architecture

The Solvio blockchain is designed specifically for decentralized communication:

- **Message Routing Nodes (MRN)**: Handle real-time message delivery
- **Storage Nodes (SN)**: Manage message history and user identities
- **Validator Nodes (VN)**: Participate in DPoS consensus

For detailed architecture information, see [BLOCKCHAIN_DESIGN.md](BLOCKCHAIN_DESIGN.md).

## Development Setup

1. Ensure Python 3.12 is installed
2. Install Poetry for dependency management
3. Clone the repository:
   ```bash
   git clone https://github.com/solvio/solvio-blockchain.git
   cd solvio-blockchain
   ```
4. Install dependencies:
   ```bash
   poetry install
   ```
5. Run tests:
   ```bash
   poetry run pytest
   ```

## Project Structure

```
solvio-blockchain/
├── solvio/
│   └── blockchain/
│       ├── models.py      # Core blockchain data models
│       ├── nodes.py       # Node implementations (MRN, SN, VN)
│       ├── consensus.py   # DPoS consensus implementation
│       └── tests/         # Unit tests
├── tests/                 # Integration tests
├── docs/                  # Documentation
└── pyproject.toml        # Project configuration
```

## Testing

The project uses pytest for testing:

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=solvio

# Run specific test file
poetry run pytest tests/test_consensus.py
```

## Contributing

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Run tests and ensure they pass
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details
