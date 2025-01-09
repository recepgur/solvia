import { useEffect, useState, useCallback } from 'react';
import { useWebRTC } from '../services/WebRTCService';
import { Call } from '@solvia/messenger-shared';

export const useCallNotification = () => {
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const webRTC = useWebRTC();

  useEffect(() => {
    if (!webRTC) return;

    const notificationSound = new Audio('/sounds/call-notification.mp3');

    const handleIncomingCall = (call: Call) => {
      setIncomingCall(call);
      notificationSound.play().catch(console.error);
    };

    const handleCallEnded = () => {
      setIncomingCall(null);
      notificationSound.pause();
      notificationSound.currentTime = 0;
    };

    webRTC.on('callStatus', ({ status, call }) => {
      if (status === 'ringing' && call) {
        handleIncomingCall(call);
      } else if (status === 'ended') {
        handleCallEnded();
      }
    });

    return () => {
      webRTC.removeAllListeners('callStatus');
      notificationSound.pause();
      notificationSound.currentTime = 0;
    };
  }, [webRTC]);

  const handleAcceptCall = useCallback(() => {
    if (webRTC && incomingCall) {
      webRTC.acceptCall(incomingCall);
      setIncomingCall(null);
    }
  }, [webRTC, incomingCall]);

  const handleRejectCall = useCallback(() => {
    if (webRTC && incomingCall) {
      webRTC.rejectCall(incomingCall);
      setIncomingCall(null);
    }
  }, [webRTC, incomingCall]);

  return {
    incomingCall,
    onAcceptCall: handleAcceptCall,
    onRejectCall: handleRejectCall,
  };
};
