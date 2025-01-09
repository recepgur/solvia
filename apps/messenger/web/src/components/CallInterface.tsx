import React, { useEffect, useRef, useState } from 'react';
import { useWebRTC } from '../services/WebRTCService';
import { Call } from '../../../shared/src/types';

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
        
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4">
          <button
            onClick={handleToggleAudio}
            className={`p-4 rounded-full ${
              isMuted ? 'bg-red-500' : 'bg-gray-600'
            } hover:bg-opacity-80 transition-colors`}
          >
            <span className="sr-only">{isMuted ? 'Unmute' : 'Mute'}</span>
            {/* Add microphone icon */}
          </button>
          
          {call.type === 'video' && (
            <button
              onClick={handleToggleVideo}
              className={`p-4 rounded-full ${
                !isVideoEnabled ? 'bg-red-500' : 'bg-gray-600'
              } hover:bg-opacity-80 transition-colors`}
            >
              <span className="sr-only">
                {isVideoEnabled ? 'Disable Video' : 'Enable Video'}
              </span>
              {/* Add video icon */}
            </button>
          )}
          
          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          >
            <span className="sr-only">End Call</span>
            {/* Add end call icon */}
          </button>
        </div>
      </div>
    </div>
  );
};
