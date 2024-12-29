import React, { useState, useEffect, useCallback } from 'react';
import { initializePolyfills } from '../polyfills';
import { LoadingScreen } from '../components/ui';
import { p2pNetwork } from '../services/p2p-network';

interface VideoCallProps {
  roomId: string;
  onError?: (error: Error) => void;
}

interface WebRTCState {
  isInitializing: boolean;
  error: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
}

const VideoCall: React.FC<VideoCallProps> = ({ roomId, onError }) => {
  const [state, setState] = useState<WebRTCState>({
    isInitializing: true,
    error: null,
    localStream: null,
    remoteStream: null,
    isConnected: false
  });

  const setupWebRTC = useCallback(async () => {
    try {
      await initializePolyfills();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Initialize WebRTC connection
      const peerConnection = await p2pNetwork.createPeerConnection(roomId);
      
      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Listen for remote stream
      peerConnection.ontrack = (event) => {
        setState(prev => ({
          ...prev,
          remoteStream: event.streams[0]
        }));
      };

      setState(prev => ({
        ...prev,
        isInitializing: false,
        localStream: stream
      }));

      // Initiate connection if we're the caller
      await p2pNetwork.initiateConnection(roomId);
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize video call';
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: errorMessage
      }));
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [roomId, onError]);

  useEffect(() => {
    setupWebRTC();

    // Set up P2P network event listeners
    const handleConnectionStateChange = ({ peerId, state: connectionState }: { peerId: string, state: RTCPeerConnectionState }) => {
      if (peerId === roomId) {
        setState(prev => ({
          ...prev,
          isConnected: connectionState === 'connected'
        }));
      }
    };

    p2pNetwork.on('connection-state-change', handleConnectionStateChange);


    // Cleanup function
    return () => {
      state.localStream?.getTracks().forEach(track => track.stop());
      state.remoteStream?.getTracks().forEach(track => track.stop());
      p2pNetwork.disconnect(roomId);
      p2pNetwork.removeListener('connection-state-change', handleConnectionStateChange);
    };
  }, [setupWebRTC, roomId]);

  if (state.isInitializing) {
    return <LoadingScreen message="Initializing video call..." fullScreen={false} />;
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-100">
        <div className="text-center text-red-600">
          <p>Failed to initialize video call: {state.error}</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => setupWebRTC()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-100 min-h-[400px]">
      {/* Local video stream */}
      <div className="relative">
        <video
          ref={video => {
            if (video && state.localStream) {
              video.srcObject = state.localStream;
            }
          }}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover rounded-lg"
        />
        <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
          You
        </div>
      </div>

      {/* Remote video stream */}
      <div className="relative">
        {state.remoteStream ? (
          <video
            ref={video => {
              if (video && state.remoteStream) {
                video.srcObject = state.remoteStream;
              }
            }}
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-200 rounded-lg">
            <p>Waiting for participant to join...</p>
          </div>
        )}
      </div>

      {/* Call controls */}
      <div className="col-span-2 flex justify-center gap-4 mt-4">
        <button 
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={() => {
            p2pNetwork.disconnect(roomId);
            state.localStream?.getTracks().forEach(track => track.stop());
            window.close();
          }}
        >
          End Call
        </button>
        <button 
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          onClick={() => {
            const audioTrack = state.localStream?.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = !audioTrack.enabled;
            }
          }}
        >
          {state.localStream?.getAudioTracks()[0]?.enabled ? 'Mute' : 'Unmute'}
        </button>
        <button 
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          onClick={() => {
            const videoTrack = state.localStream?.getVideoTracks()[0];
            if (videoTrack) {
              videoTrack.enabled = !videoTrack.enabled;
            }
          }}
        >
          {state.localStream?.getVideoTracks()[0]?.enabled ? 'Stop Video' : 'Start Video'}
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
