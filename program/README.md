# Solvio Communication Program

This is the core Solana program for the Solvio decentralized communication platform. It handles:

- User identity management
- Group creation and management
- Message verification
- Access control

## Structure

The program implements four main instructions:
1. Create user account
2. Create group
3. Store message hash
4. Verify identity

## Development

Build the program:
```bash
cargo build-bpf
```

Deploy to devnet:
```bash
solana program deploy target/deploy/solvio_program.so
```

## Security

This program implements core security features for the Solvio platform:
- Identity verification
- Message integrity
- Access control
- Group management

## Testing

Run tests:
```bash
cargo test-bpf
```
