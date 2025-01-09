import React, { useEffect, useRef, useState } from 'react';
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
    if (localVideoRef.current && call.type === 'video') {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch((error) => console.error('Error accessing media devices:', error));
    }
  }, [call.type]);

  const handleToggleAudio = () => {
    if (webRTC) {
      const newMutedState = !isMuted;
      webRTC.toggleAudio(!newMutedState);
      setIsMuted(newMutedState);
    }
  };

  const handleToggleVideo = () => {
    if (webRTC) {
      const newVideoState = !isVideoEnabled;
      webRTC.toggleVideo(newVideoState);
      setIsVideoEnabled(newVideoState);
    }
  };

  const handleEndCall = () => {
    if (webRTC) {
      webRTC.endCall();
      onEndCall();
    }
  };

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
