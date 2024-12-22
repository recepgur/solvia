import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { uploadToIPFS } from '../services/ipfs';
import { Button } from './ui/button';
import { useWallet } from '@solana/wallet-adapter-react';

interface PeerConnection {
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  stream: MediaStream | null;
}

interface Participant {
  id: string;
  stream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

interface CallLog {
  timestamp: string;
  type: 'incoming' | 'outgoing' | 'missed';
  participants: string[];
  duration?: number;
  ipfsHash?: string;
}

export function VideoCall() {
  const { t } = useLanguage();
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isCalling, setIsCalling] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const { publicKey } = useWallet();

  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoEnabled,
          audio: isAudioEnabled,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        alert(t('error.media.access'));
      }
    };

    initializeMedia();
    return () => {
      // Stop all tracks in local stream
      localStream?.getTracks().forEach(track => track.stop());
      
      // Close all peer connections
      peerConnectionsRef.current.forEach(peer => {
        peer.connection.close();
      });
      peerConnectionsRef.current.clear();
      
      // Clear participants
      setParticipants(new Map());
      setIsCalling(false);
    };
  }, [isVideoEnabled, isAudioEnabled, t]);

  const createPeerConnection = async (participantId: string) => {
    const peerConnection = new RTCPeerConnection(configuration);
    const dataChannel = peerConnection.createDataChannel('chat');

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Store ICE candidate in IPFS and share the hash
        const candidateData = {
          type: 'candidate',
          from: publicKey?.toString(),
          to: participantId,
          candidate: event.candidate
        };
        uploadToIPFS(candidateData).catch(console.error);
      }
    };

    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      setParticipants(prev => {
        const updated = new Map(prev);
        updated.set(participantId, {
          id: participantId,
          stream,
          videoEnabled: true,
          audioEnabled: true
        });
        return updated;
      });
    };

    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    peerConnectionsRef.current.set(participantId, {
      connection: peerConnection,
      dataChannel,
      stream: null
    });

    // Request notification permission if not granted
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    return peerConnection;
  };

  const [callStartTime, setCallStartTime] = useState<number>(0);

  const startCall = async () => {
    if (!publicKey) {
      alert(t('error.wallet.not.connected'));
      return;
    }

    setIsCalling(true);
    setCallStartTime(Date.now());

    try {
      // In a real implementation, we would get the participant list from the group
      const participantIds = ['participant1', 'participant2']; // Example
      
      // Create peer connections for all participants
      await Promise.all(participantIds.map(async (participantId) => {
        const peerConnection = await createPeerConnection(participantId);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        // Store offer in IPFS and share the hash
        const offerData = {
          type: 'offer',
          from: publicKey.toString(),
          to: participantId,
          offer
        };
        await uploadToIPFS(offerData);
      }));

      // Show notification
      if (Notification.permission === 'granted') {
        new Notification(t('call.started'), {
          body: t('call.group.started'),
          icon: '/path/to/icon.png'
        });
      }
    } catch (error) {
      console.error('Error starting call:', error);
      alert(t('error.call.start'));
      endCall();
    }
  };

  const endCall = () => {
    // Close all peer connections
    peerConnectionsRef.current.forEach(peer => {
      peer.connection.close();
    });
    peerConnectionsRef.current.clear();
    
    // Log the call
    const newLog: CallLog = {
      timestamp: new Date().toISOString(),
      type: 'outgoing',
      participants: Array.from(participants.keys()),
      duration: Date.now() - callStartTime
    };
    setCallLogs((prev: CallLog[]) => [...prev, newLog]);
    
    // Upload call log to IPFS
    uploadToIPFS(JSON.stringify(newLog)).catch(console.error);
    
    setIsCalling(false);
    setParticipants(new Map());
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="grid flex-1 grid-cols-3 gap-4 auto-rows-fr">
        <div className="relative aspect-video rounded-lg bg-zinc-900">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full rounded-lg object-cover"
          />
          <div className="absolute bottom-4 left-4 text-white text-sm">
            {t('video.you')} ({publicKey?.toBase58().slice(0, 8)}...)
          </div>
        </div>
        {Array.from(participants.entries()).map(([id, participant]) => (
          <div key={id} className="relative aspect-video rounded-lg bg-zinc-900">
            <video
              ref={(el) => {
                if (el && participant.stream) {
                  el.srcObject = participant.stream;
                }
              }}
              autoPlay
              playsInline
              className="h-full w-full rounded-lg object-cover"
            />
            <div className="absolute bottom-4 left-4 text-white text-sm">
              {id.slice(0, 8)}...
            </div>
            {!participant.videoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <VideoOff className="h-8 w-8 text-white opacity-50" />
              </div>
            )}
            {!participant.audioEnabled && (
              <div className="absolute top-4 right-4">
                <MicOff className="h-4 w-4 text-white opacity-50" />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {callLogs.length > 0 && (
        <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
          <h3 className="text-sm font-medium mb-2">{t('call.history')}</h3>
          <div className="space-y-2">
            {callLogs.map((log, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{log.type === 'outgoing' ? '→' : '←'} {log.participants.join(', ')}</span>
                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                {log.duration && <span>{Math.round(log.duration / 1000)}s</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex justify-center space-x-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsVideoEnabled(!isVideoEnabled)}
          className={!isVideoEnabled ? 'bg-red-500 text-white' : ''}
        >
          {isVideoEnabled ? (
            <Video className="h-4 w-4" />
          ) : (
            <VideoOff className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsAudioEnabled(!isAudioEnabled)}
          className={!isAudioEnabled ? 'bg-red-500 text-white' : ''}
        >
          {isAudioEnabled ? (
            <Mic className="h-4 w-4" />
          ) : (
            <MicOff className="h-4 w-4" />
          )}
        </Button>
        {!isCalling ? (
          <Button 
            onClick={startCall} 
            size="icon"
            title={t('button.start.call')}
          >
            <Phone className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            onClick={endCall} 
            variant="destructive" 
            size="icon"
            title={t('button.end.call')}
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
