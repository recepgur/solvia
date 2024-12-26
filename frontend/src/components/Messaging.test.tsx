import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { Messaging } from './Messaging';

// Mock dependencies
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    publicKey: {
      toBase58: () => 'test-wallet-address'
    }
  })
}));

jest.mock('../hooks/useBackup', () => ({
  useBackup: () => ({
    backupAllChats: jest.fn()
  })
}));

jest.mock('../hooks/useKeyManagement', () => ({
  useKeyManagement: () => ({
    encryptForRecipient: jest.fn(),
    decryptFromSender: jest.fn(),
    isInitialized: true
  })
}));

// Mock MediaRecorder
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockDataAvailable = jest.fn();
const mockStream = new MediaStream();

class MockMediaRecorder {
  ondataavailable: ((e: any) => void) | null = null;
  onstop: (() => void) | null = null;
  
  constructor() {
    setTimeout(() => {
      this.ondataavailable?.({ data: new Blob() });
    }, 100);
  }

  start = mockStart;
  stop = mockStop;
}

global.MediaRecorder = MockMediaRecorder as any;

// Mock getUserMedia
const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia }
});

describe('Messaging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders messaging interface', () => {
    const { getByPlaceholderText, getByRole } = render(<Messaging />);
    
    expect(getByPlaceholderText('Type a message...')).toBeTruthy();
    expect(getByRole('button', { name: /send/i })).toBeTruthy();
  });

  it('handles voice recording', async () => {
    const { getByRole } = render(<Messaging />);
    const recordButton = getByRole('button', { name: /microphone/i });

    // Start recording
    await act(async () => {
      fireEvent.click(recordButton);
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(mockStart).toHaveBeenCalled();

    // Stop recording
    await act(async () => {
      fireEvent.click(recordButton);
    });

    expect(mockStop).toHaveBeenCalled();
  });

  it('handles browser compatibility check', async () => {
    // Temporarily remove MediaRecorder
    const originalMediaRecorder = window.MediaRecorder;
    delete (window as any).MediaRecorder;

    const { getByRole } = render(<Messaging />);
    const recordButton = getByRole('button', { name: /microphone/i });

    // Attempt to start recording
    await act(async () => {
      fireEvent.click(recordButton);
    });

    expect(mockStart).not.toHaveBeenCalled();

    // Restore MediaRecorder
    window.MediaRecorder = originalMediaRecorder;
  });
});
