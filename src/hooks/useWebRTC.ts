import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WebRTCService } from '@/services/p2p/WebRTCService';
import { generateMessageKeypair } from '@/utils/encryption';
import { useToast } from '@chakra-ui/react';

export interface CallState {
  isInCall: boolean;
  isCaller: boolean;
  remotePublicKey: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export const useWebRTC = () => {
  const { publicKey } = useWallet();
  const [webRTCService, setWebRTCService] = useState<WebRTCService | null>(null);
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isCaller: false,
    remotePublicKey: null,
    localStream: null,
    remoteStream: null,
  });
  const toast = useToast();

  useEffect(() => {
    if (publicKey) {
      const keypair = generateMessageKeypair();
      const service = new WebRTCService(keypair);
      
      service.on('peer:connect', (remotePublicKey: string) => {
        setCallState(prev => ({ ...prev, isInCall: true, remotePublicKey }));
        toast({
          title: 'Call Connected',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      });

      service.on('peer:close', () => {
        setCallState({
          isInCall: false,
          isCaller: false,
          remotePublicKey: null,
          localStream: null,
          remoteStream: null,
        });
        toast({
          title: 'Call Ended',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      });

      service.on('peer:stream', ({ stream, publicKey }) => {
        setCallState(prev => ({ ...prev, remoteStream: stream }));
      });

      service.on('peer:error', ({ error, publicKey }) => {
        toast({
          title: 'Call Error',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });

      setWebRTCService(service);

      return () => {
        service.endAllConnections();
      };
    }
  }, [publicKey, toast]);

  const initiateCall = useCallback(async (recipientPublicKey: string) => {
    if (!webRTCService) return null;

    try {
      const localStream = await webRTCService.initializeMediaStream();
      setCallState(prev => ({
        ...prev,
        isCaller: true,
        localStream,
      }));

      const offerSignal = await webRTCService.initiatePeerConnection(recipientPublicKey);
      return offerSignal;
    } catch (error: any) {
      toast({
        title: 'Failed to Start Call',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return null;
    }
  }, [webRTCService, toast]);

  const acceptCall = useCallback(async (signalData: string, callerPublicKey: string) => {
    if (!webRTCService) return null;

    try {
      const localStream = await webRTCService.initializeMediaStream();
      setCallState(prev => ({
        ...prev,
        localStream,
      }));

      const answerSignal = await webRTCService.acceptPeerConnection(signalData, callerPublicKey);
      return answerSignal;
    } catch (error: any) {
      toast({
        title: 'Failed to Accept Call',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return null;
    }
  }, [webRTCService, toast]);

  const endCall = useCallback(() => {
    if (!webRTCService || !callState.remotePublicKey) return;

    webRTCService.endConnection(callState.remotePublicKey);
    setCallState({
      isInCall: false,
      isCaller: false,
      remotePublicKey: null,
      localStream: null,
      remoteStream: null,
    });
  }, [webRTCService, callState.remotePublicKey]);

  const toggleVideo = useCallback(() => {
    if (!webRTCService) return false;
    return webRTCService.toggleVideo();
  }, [webRTCService]);

  const toggleAudio = useCallback(() => {
    if (!webRTCService) return false;
    return webRTCService.toggleAudio();
  }, [webRTCService]);

  return {
    callState,
    initiateCall,
    acceptCall,
    endCall,
    toggleVideo,
    toggleAudio,
  };
};
