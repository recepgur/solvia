import { PublicKey } from '@solana/web3.js';
import { encryptMessage, decryptMessage } from '../crypto';
import { Buffer } from 'buffer';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeAll } from '@jest/globals';

// Use consistent mock values across all tests
const MOCK_PUBKEY = '11111111111111111111111111111111';
const MOCK_PRIVKEY = new Uint8Array(32).fill(1);

describe('End-to-end encryption', () => {
  let recipientPubKey: PublicKey;

  beforeAll(() => {
    // Initialize test keys
    recipientPubKey = new PublicKey(MOCK_PUBKEY);
  });

  it('should successfully encrypt and decrypt messages between users', async () => {
    const message = 'Hello, this is a secret message!';
    
    // Alice encrypts message for Bob
    const encrypted = await encryptMessage(message, recipientPubKey);
    expect(encrypted.encryptedContent).toBeDefined();
    expect(encrypted.ephemeralPublicKey).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    
    // Bob decrypts message from Alice
    const decrypted = await decryptMessage(encrypted, MOCK_PRIVKEY);
    expect(decrypted).toBe(message);
  });

  it('should maintain message confidentiality', async () => {
    const message = 'Top secret information';
    
    // Alice encrypts message
    const encrypted = await encryptMessage(message, recipientPubKey);
    
    // Verify encrypted message is not readable
    expect(encrypted.encryptedContent).not.toContain(message);
    expect(Buffer.from(encrypted.encryptedContent, 'base64').toString()).not.toContain(message);
  });

  it('should use unique ephemeral keys for each message', async () => {
    const message1 = 'First message';
    const message2 = 'Second message';
    
    // Encrypt two messages
    const encrypted1 = await encryptMessage(message1, recipientPubKey);
    const encrypted2 = await encryptMessage(message2, recipientPubKey);
    
    // Keys should be different - their string representations should not match
    expect(encrypted1.ephemeralPublicKey).not.toBe(encrypted2.ephemeralPublicKey);
  });

  it('should fail to decrypt with wrong private key', async () => {
    const message = 'Secret message';
    
    // Alice encrypts message for Bob
    const encrypted = await encryptMessage(message, recipientPubKey);
    
    // Try to decrypt with wrong private key
    const wrongKey = new Uint8Array(32).fill(99);
    await expect(
      decryptMessage(encrypted, wrongKey)
    ).rejects.toThrow('Decryption failed: Invalid private key or corrupted message');
  });
});
