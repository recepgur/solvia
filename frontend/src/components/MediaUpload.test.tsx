/** @jest-environment jsdom */
/** @jsxImportSource react */
import { render } from '../test/test-utils';
import { MediaUpload } from './MediaUpload';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
// Import jest-dom matchers without type declaration since it's already included in setupTests.ts

// Mock implementations
const mockWalletState = jest.fn();
const mockMediaState = jest.fn();

// Mock the hooks
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => mockWalletState()
}));

jest.mock('../hooks/useMedia', () => ({
  useMedia: () => mockMediaState()
}));

describe('MediaUpload', () => {
  beforeEach(() => {
    mockWalletState.mockReturnValue({
      publicKey: null,
      connected: false,
    });
    mockMediaState.mockReturnValue({
      uploadMedia: jest.fn(),
      isUploading: false,
      progress: 0
    });
  });

  it('renders without crashing', () => {
    const { container } = render(<MediaUpload onUpload={() => {}} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('should require wallet connection', async () => {
    render(<MediaUpload onUpload={() => {}} />);
    const fileInput = screen.getByLabelText('Attach File');
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, file);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Please connect your wallet');
    });
  });

  it('should verify Solvio token before upload', async () => {
    mockWalletState.mockReturnValue({
      publicKey: 'test-public-key',
      connected: true,
    });
    
    const mockUploadMedia = jest.fn().mockImplementation(() => Promise.reject(new Error('error.token.required'))) as jest.Mock;
    mockMediaState.mockReturnValue({
      uploadMedia: mockUploadMedia,
      isUploading: false,
      progress: 0
    });

    render(<MediaUpload onUpload={() => {}} />);
    const fileInput = screen.getByLabelText('Attach File');
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, file);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Solvio token is required to upload media');
    });
  });
});
