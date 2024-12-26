import { render, fireEvent, waitFor } from '@testing-library/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MediaUpload } from './MediaUpload';
import { useMedia } from '../hooks/useMedia';

jest.mock('@solana/wallet-adapter-react');
jest.mock('../hooks/useMedia');

describe('MediaUpload Component', () => {
  beforeEach(() => {
    (useWallet as jest.Mock).mockReturnValue({
      publicKey: null,
      connected: false,
    });
    (useMedia as jest.Mock).mockReturnValue({
      uploadMedia: jest.fn(),
      isUploading: false,
    });
  });

  it('should require wallet connection', async () => {
    const { getByText, getByLabelText } = render(<MediaUpload onUpload={() => {}} />);
    const fileInput = getByLabelText('Attach File');
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(getByText('Please connect your wallet')).toBeInTheDocument();
    });
  });

  it('should verify Solvio token before upload', async () => {
    (useWallet as jest.Mock).mockReturnValue({
      publicKey: 'test-public-key',
      connected: true,
    });
    
    const mockUploadMedia = jest.fn().mockRejectedValue(new Error('error.token.required'));
    (useMedia as jest.Mock).mockReturnValue({
      uploadMedia: mockUploadMedia,
      isUploading: false,
    });

    const { getByText, getByLabelText } = render(<MediaUpload onUpload={() => {}} />);
    const fileInput = getByLabelText('Attach File');
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(getByText('Solvio token is required to upload media')).toBeInTheDocument();
    });
  });
});
