import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useWebRTC } from '../services/WebRTCService';
import { Call } from '@solvia/messenger-shared';
import { CallControls } from './CallControls';

interface Props {
  call: Call;
  onEndCall: () => void;
}

export const CallInterface: React.FC<Props> = ({ call, onEndCall }) => {
  const webRTC = useWebRTC();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!webRTC) return;

    const handleLocalStream = (stream: MediaStream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    };

    const handleRemoteStream = (stream: MediaStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    const handleAudioEnabled = (enabled: boolean) => {
      setIsMuted(!enabled);
    };

    const handleVideoEnabled = (enabled: boolean) => {
      setIsVideoEnabled(enabled);
    };

    const handleCallStatus = ({ status }: { status: string }) => {
      if (status === 'ended') {
        onEndCall();
      }
    };

    webRTC.on('localStream', handleLocalStream);
    webRTC.on('remoteStream', handleRemoteStream);
    webRTC.on('audioEnabled', handleAudioEnabled);
    webRTC.on('videoEnabled', handleVideoEnabled);
    webRTC.on('callStatus', handleCallStatus);

    return () => {
      webRTC.removeListener('localStream', handleLocalStream);
      webRTC.removeListener('remoteStream', handleRemoteStream);
      webRTC.removeListener('audioEnabled', handleAudioEnabled);
      webRTC.removeListener('videoEnabled', handleVideoEnabled);
      webRTC.removeListener('callStatus', handleCallStatus);
    };
  }, [webRTC, onEndCall]);

  const handleToggleAudio = useCallback(() => {
    if (webRTC) {
      const newMutedState = !isMuted;
      webRTC.toggleAudio(!newMutedState);
    }
  }, [webRTC, isMuted]);

  const handleToggleVideo = useCallback(() => {
    if (webRTC) {
      const newVideoState = !isVideoEnabled;
      webRTC.toggleVideo(newVideoState);
    }
  }, [webRTC, isVideoEnabled]);

  const handleEndCall = useCallback(() => {
    if (webRTC) {
      webRTC.endCall();
    }
  }, [webRTC]);

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
      <div className="relative w-full max-w-4xl">
        {call.type === 'video' && (
          <div className="aspect-w-16 aspect-h-9 bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={remoteVideoRef}
              id="remoteVideo"
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-4 right-4 w-48 rounded-lg shadow-lg"
            />
          </div>
        )}
        
        <CallControls
          call={call}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onEndCall={handleEndCall}
        />
      </div>
    </div>
  );
};
