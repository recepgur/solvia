import React from 'react';
import { render, act } from '@testing-library/react';
import { AudioWaveform } from './AudioWaveform';

// Mock canvas context
const mockGetContext = jest.fn();
HTMLCanvasElement.prototype.getContext = mockGetContext;

// Mock AudioContext and related APIs
const mockCreateAnalyser = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockGetByteFrequencyData = jest.fn();

class MockAnalyserNode {
  frequencyBinCount = 128;
  connect = mockConnect;
  disconnect = mockDisconnect;
  getByteFrequencyData = mockGetByteFrequencyData;
}

class MockAudioContext {
  createAnalyser = () => {
    const analyser = new MockAnalyserNode();
    mockCreateAnalyser(analyser);
    return analyser;
  };
  createMediaStreamSource = () => ({
    connect: mockConnect,
    disconnect: mockDisconnect
  });
  createMediaElementSource = () => ({
    connect: mockConnect,
    disconnect: mockDisconnect
  });
  destination = {};
}

// Mock window.AudioContext
window.AudioContext = MockAudioContext as any;
(window as any).webkitAudioContext = MockAudioContext;

describe('AudioWaveform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetContext.mockReturnValue({
      fillStyle: '',
      fillRect: jest.fn(),
    });
  });

  it('renders canvas element', () => {
    const { container } = render(<AudioWaveform isRecording={false} />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('initializes audio context and analyser when recording', () => {
    const mockStream = new MediaStream();
    render(<AudioWaveform stream={mockStream} isRecording={true} />);
    
    expect(mockCreateAnalyser).toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalled();
  });

  it('cleans up resources when unmounting', () => {
    const mockStream = new MediaStream();
    const { unmount } = render(<AudioWaveform stream={mockStream} isRecording={true} />);
    
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('handles playback mode with audio URL', () => {
    const { rerender } = render(
      <AudioWaveform 
        audioUrl="test.webm" 
        isRecording={false}
        onPlaybackComplete={() => {}}
      />
    );

    expect(mockCreateAnalyser).toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalledTimes(2); // One for analyser, one for destination

    // Test cleanup on rerender
    rerender(<AudioWaveform isRecording={false} />);
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
