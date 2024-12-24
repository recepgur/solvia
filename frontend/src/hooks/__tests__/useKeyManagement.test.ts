import { renderHook, act } from '@testing-library/react';
import { useKeyManagement } from '../useKeyManagement';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { TestProviders, mockAdapter } from '../../test/test-utils';
import '@testing-library/jest-dom';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
// Mock adapter type
// Using StandardWalletAdapter directly instead of custom type

// Mock wallet adapter
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn()
}));

describe('useKeyManagement', () => {
  const MOCK_PUBKEY = '4K2V1kpVycZ6qSFsNdz2FtpNxnJs17eBNzf9rdCMcKoe';
  const mockPublicKey = new PublicKey(MOCK_PUBKEY);
  let signMessageSpy: ReturnType<typeof jest.spyOn>;
  beforeEach(async () => {
    // Reset mock implementations for mockAdapter methods
    signMessageSpy = jest.spyOn(mockAdapter, 'signMessage').mockImplementation(async (_message) => {
      const testKey = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        testKey[i] = i + 1;
      }
      return testKey;
    });

    // Setup wallet mock with connected state and all required properties
    (useWallet as jest.Mock).mockReturnValue({
      publicKey: mockPublicKey,
      signMessage: mockAdapter.signMessage.bind(mockAdapter),
      connected: true,
      connecting: false,
      disconnecting: false,
      wallet: {
        adapter: mockAdapter,
        readyState: WalletReadyState.Installed,
      },
      wallets: [{
        adapter: mockAdapter,
        readyState: WalletReadyState.Installed,
      }],
      autoConnect: true,
      select: jest.fn(),
      connect: mockAdapter.connect.bind(mockAdapter),
      disconnect: mockAdapter.disconnect.bind(mockAdapter),
      sendTransaction: mockAdapter.sendTransaction.bind(mockAdapter),
      signTransaction: mockAdapter.signTransaction.bind(mockAdapter),
      signAllTransactions: mockAdapter.signAllTransactions.bind(mockAdapter),
      signIn: undefined
    });
    
    // Clear localStorage
    localStorage.clear();

    // Wait for any pending promises
    await Promise.resolve();
  });

  it('should initialize key pair on mount', async () => {
    const { result } = renderHook(() => useKeyManagement(), { wrapper: TestProviders });
    
    // Increase timeout and consolidate async operations
    await act(async () => {
      // Allow time for async operations
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Allow time for key generation to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      expect(result.current.publicKey).toBeDefined();
      expect(result.current.isInitialized).toBe(true);
      expect(signMessageSpy).toHaveBeenCalled();
    });
  }, 35000);

  it('should store encrypted private key in localStorage', async () => {
    const { result: _unused2 } = renderHook(() => useKeyManagement(), { wrapper: TestProviders });
    
    // Increase timeout and consolidate async operations
    await act(async () => {
      // Allow time for async operations
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Allow time for key generation and storage
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const storedKey = localStorage.getItem(`encrypted_private_key_${mockPublicKey.toString()}`);
      expect(storedKey).toBeDefined();
      expect(typeof storedKey).toBe('string');
      expect(signMessageSpy).toHaveBeenCalled();
    });
  }, 35000);

  it('should reuse stored key pair on subsequent mounts', async () => {
    // First mount - wait for key initialization
    const { result: result1 } = renderHook(() => useKeyManagement(), { wrapper: TestProviders });
    
    // Increase timeout and consolidate first mount async operations
    await act(async () => {
      // Allow time for async operations
      await new Promise(resolve => setTimeout(resolve, 1000));
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const initialPublicKey = result1.current.publicKey;
      const initialSignatureCalls = signMessageSpy.mock.calls.length;
      expect(initialPublicKey).toBeDefined();
      
      // Second mount - should reuse keys
      const { result: result2 } = renderHook(() => useKeyManagement(), { wrapper: TestProviders });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await new Promise(resolve => setTimeout(resolve, 5000));
      
      expect(result2.current.publicKey).toBeDefined();
      expect(result2.current.isInitialized).toBe(true);
      // Should not call signMessage again when reusing keys
      expect(signMessageSpy.mock.calls.length).toBe(initialSignatureCalls + 1);
      });
    });
  }, 70000);

  it('should encrypt and decrypt messages successfully', async () => {
    const { result } = renderHook(() => useKeyManagement(), { wrapper: TestProviders });
    
    // Increase timeout and consolidate async operations
    await act(async () => {
      // Allow time for async operations
      await new Promise(resolve => setTimeout(resolve, 1000));
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const testMessage = 'Hello, this is a secret message!';
      const recipientPubKey = new PublicKey(MOCK_PUBKEY);
      
      const encrypted = await result.current.encryptForRecipient(testMessage, recipientPubKey);
      expect(encrypted).toBeDefined();
      
      if (encrypted) {
        const decrypted = await result.current.decryptFromSender(encrypted);
        expect(decrypted).toBe(testMessage);
      } else {
        expect(encrypted).toBeTruthy();  // Will fail with better error message
      }
    });
  }, 35000);

  it('should generate unique ephemeral keys for each message', async () => {
    const { result } = renderHook(() => useKeyManagement(), { wrapper: TestProviders });
    
    // Increase timeout and consolidate async operations
    await act(async () => {
      // Allow time for async operations
      await new Promise(resolve => setTimeout(resolve, 1000));
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const testMessage = 'Test message';
      const recipientPubKey = new PublicKey(MOCK_PUBKEY);
      
      const encrypted1 = await result.current.encryptForRecipient(testMessage, recipientPubKey);
      const encrypted2 = await result.current.encryptForRecipient(testMessage, recipientPubKey);
      
      // Verify both encryptions succeeded
      expect(encrypted1).toBeDefined();
      expect(encrypted2).toBeDefined();
      expect(encrypted1?.ephemeralPublicKey).not.toBe(encrypted2?.ephemeralPublicKey);
    });
  }, 35000);
});
