/** @jest-environment jsdom */
/** @jsxImportSource react */
import '@testing-library/jest-dom';
import { render, mockAdapter } from '../test/test-utils';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { MediaUpload } from './MediaUpload';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PublicKey } from '@solana/web3.js';

// Extend expect matchers
expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null;
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be in the document`,
      pass,
    };
  },
});

type UploadMediaFn = (file: File) => Promise<{ hash: string; type: string }>;

// Mock hooks
// Mock wallet adapter
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    publicKey: mockAdapter.publicKey,
    connected: mockAdapter.connected,
    connecting: mockAdapter.connecting,
    disconnect: mockAdapter.disconnect.bind(mockAdapter),
    connect: mockAdapter.connect.bind(mockAdapter),
    select: () => {},
    wallet: mockAdapter,
    wallets: [mockAdapter],
    signTransaction: mockAdapter.signTransaction.bind(mockAdapter),
    signAllTransactions: mockAdapter.signAllTransactions.bind(mockAdapter),
    signMessage: mockAdapter.signMessage.bind(mockAdapter),
  })
}));

const mockUseMedia = {
  uploadMedia: jest.fn() as jest.MockedFunction<UploadMediaFn>,
  isUploading: false,
  progress: 0,
  __setHasToken: jest.fn()
};

jest.mock('../hooks/useMedia', () => ({
  useMedia: () => mockUseMedia
}));

describe('MediaUpload', () => {
  beforeEach(() => {
    // Reset mock adapter state before each test
    mockAdapter._connected = false;
    mockAdapter._connecting = false;
    mockAdapter._publicKey = null;

    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should require wallet connection', async () => {
    render(<MediaUpload onUpload={() => {}} />);

    const fileInput = screen.getByLabelText('Attach File');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    await userEvent.upload(fileInput, file);
    
    await waitFor(() => {
      const errorElement = screen.getByTestId('error-message');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement.textContent).toBe('Please connect your wallet');
    }, { timeout: 3000 });
  });

  it('should verify Solvio token before upload', async () => {
    mockAdapter._connected = true;
    mockAdapter._publicKey = new PublicKey('11111111111111111111111111111111');
    
    mockUseMedia.uploadMedia.mockImplementationOnce(() => Promise.reject(new Error('error.token.required')));

    render(<MediaUpload onUpload={() => {}} />);

    const fileInput = screen.getByLabelText('Attach File');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    await userEvent.upload(fileInput, file);
    
    await waitFor(() => {
      const errorElement = screen.getByTestId('error-message');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement.textContent).toBe('Solvio token is required to upload media');
    }, { timeout: 3000 });
  });

  it('should handle successful upload', async () => {
    mockAdapter._connected = true;
    mockAdapter._publicKey = new PublicKey('11111111111111111111111111111111');
    const onUpload = jest.fn();
    
    mockUseMedia.uploadMedia.mockImplementationOnce(() => Promise.resolve({ hash: 'test-hash', type: 'image/jpeg' }));

    render(<MediaUpload onUpload={onUpload} />);

    const fileInput = screen.getByLabelText('Attach File');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    await userEvent.upload(fileInput, file);
    
    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith('test-hash', 'image/jpeg');
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
