import { useState, useEffect, useCallback } from 'react';
import SimplePeer from 'simple-peer';

type PeerInstance = ReturnType<typeof SimplePeer>;

interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peer: PeerInstance | null;
}

export const useWebRTC = () => {
  const [state, setState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    peer: null
  });

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      const iceServers = {
        iceServers: [{
          urls: ["stun:fr-turn6.xirsys.com"]
        }, {
          username: process.env.NEXT_PUBLIC_TURN_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
          urls: [
            "turn:fr-turn6.xirsys.com:80?transport=udp",
            "turn:fr-turn6.xirsys.com:3478?transport=udp",
            "turn:fr-turn6.xirsys.com:80?transport=tcp",
            "turn:fr-turn6.xirsys.com:3478?transport=tcp",
            "turns:fr-turn6.xirsys.com:443?transport=tcp",
            "turns:fr-turn6.xirsys.com:5349?transport=tcp"
          ]
        }]
      };

      const peer = SimplePeer({
        initiator: true,
        trickle: false,
        stream,
        config: iceServers
      });

      setState(prev => ({
        ...prev,
        localStream: stream,
        peer
      }));

      return new Promise((resolve, reject) => {
        peer.on('signal', data => {
          // Here you would typically send this signal data to the other peer
          console.log('Signal data:', data);
        });

        peer.on('stream', remoteStream => {
          setState(prev => ({
            ...prev,
            remoteStream
          }));
        });

        peer.on('error', err => {
          console.error('Peer error:', err);
          reject(err);
        });

        // Simulating connection success for now
        resolve(true);
      });
    } catch (error) {
      console.error('Failed to start call:', error);
      throw error;
    }
  }, []);

  const endCall = useCallback(() => {
    state.localStream?.getTracks().forEach(track => track.stop());
    state.peer?.destroy();
    setState({
      localStream: null,
      remoteStream: null,
      peer: null
    });
  }, [state.localStream, state.peer]);

  const toggleMute = useCallback(() => {
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  }, [state.localStream]);

  const toggleVideo = useCallback(() => {
    if (state.localStream) {
      state.localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  }, [state.localStream]);

  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    localStream: state.localStream,
    remoteStream: state.remoteStream,
    startCall,
    endCall,
    toggleMute,
    toggleVideo
  };
};
