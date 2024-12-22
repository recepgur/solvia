/** @jsxImportSource react */
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useLanguage } from '../contexts/LanguageContext';
import { Mic, MicOff, Users } from 'lucide-react';
import { Connection } from '@solana/web3.js';
import { Metaplex, walletAdapterIdentity, Nft, Sft, Metadata } from '@metaplex-foundation/js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

interface VoiceParticipant {
  peerId: string;
  audioEnabled: boolean;
}

interface VoiceRoom {
  id: string;
  name: string;
  nftRequired: string;
  memberCount: number;
  participants: Map<string, VoiceParticipant>;
}

interface PeerConnection {
  connection: RTCPeerConnection;
  audioStream: MediaStream | null;
}

export function VoiceRooms() {
  const { t } = useLanguage();
  const { publicKey, connected } = useWallet();
  
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [nftAddress, setNftAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [activeRoom, setActiveRoom] = useState<VoiceRoom | null>(null);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  
  const connection = new Connection(process.env.VITE_SOLANA_NETWORK || 'https://api.devnet.solana.com');
  const metaplex = new Metaplex(connection).use(walletAdapterIdentity(useWallet()));

  // WebRTC configuration for peer connections
  const peerConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  } as RTCConfiguration;

  const createPeerConnection = (peerId: string) => {
    const peerConnection = new RTCPeerConnection(peerConfiguration);
    
    // Add local audio tracks to the connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle incoming audio tracks
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      peerConnectionsRef.current.set(peerId, {
        connection: peerConnection,
        audioStream: remoteStream
      });
    };

    // Handle ICE candidate events
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // In step 002, we'll implement sending this to peers
        console.log('New ICE candidate:', event.candidate);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'disconnected') {
        peerConnectionsRef.current.delete(peerId);
      }
    };

    return peerConnection;
  };

  useEffect(() => {
    // Load saved rooms from localStorage
    const savedRooms = localStorage.getItem('voiceRooms');
    if (savedRooms) {
      setRooms(JSON.parse(savedRooms));
    }
  }, []);

  const handleEnableAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      setLocalStream(stream);
      setAudioPermissionGranted(true);
      setIsAudioEnabled(true);
      setAudioError(null);
    } catch (error) {
      console.error('Error accessing audio devices:', error);
      setAudioError(error instanceof DOMException ? t('audio.device.error') : t('audio.permission.error'));
      setAudioPermissionGranted(false);
      setIsAudioEnabled(false);
    }
  };

  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      // Clean up peer connections
      peerConnectionsRef.current.forEach(peer => {
        peer.connection.close();
      });
      peerConnectionsRef.current.clear();
    };
  }, [localStream]);

  const createRoom = async () => {
    if (!connected || !publicKey) {
      console.warn('Wallet not connected, cannot create room');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Verifying NFT ownership for wallet:', publicKey.toString());
      // Verify NFT ownership
      const nfts = await metaplex.nfts().findAllByOwner({ owner: publicKey });
      const ownsNft = nfts.some((nft: Nft | Sft | Metadata) => 
        'address' in nft && nft.address.toString() === nftAddress
      );
      
      if (!ownsNft) {
        alert(t('nft.required.error'));
        return;
      }

      const newRoom: VoiceRoom = {
        id: Date.now().toString(),
        name: newRoomName,
        nftRequired: nftAddress,
        memberCount: 1,
        participants: new Map([[publicKey.toString(), {
          peerId: publicKey.toString(),
          audioEnabled: true
        }]]),
      };

      const updatedRooms = [...rooms, newRoom];
      setRooms(updatedRooms);
      localStorage.setItem('voiceRooms', JSON.stringify(updatedRooms));
      
      setNewRoomName('');
      setNftAddress('');
    } catch (error) {
      console.error('Error creating room:', error);
      alert(t('room.create.error'));
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (room: VoiceRoom) => {
    if (!connected || !publicKey) {
      console.warn('Wallet not connected, cannot join room');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Verifying NFT ownership for room access:', publicKey.toString());
      // Verify NFT ownership
      const nfts = await metaplex.nfts().findAllByOwner({ owner: publicKey });
      const hasRequiredNFT = nfts.some((nft: Nft | Sft | Metadata) => 
        'address' in nft && nft.address.toString() === room.nftRequired
      );
      
      if (!hasRequiredNFT) {
        alert(t('nft.required.error'));
        return;
      }

      // Initialize audio before joining
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        setLocalStream(stream);
      } catch (audioError) {
        console.error('Error accessing microphone:', audioError);
        alert(t('room.join.error'));
        return;
      }

      setActiveRoom(room);
      
      // Create peer connections for existing participants
      // In step 002, we'll implement the actual peer discovery mechanism
      // For now, we're just setting up the local state
      const existingParticipants = Array.from(room.participants.keys());
      existingParticipants.forEach(participantId => {
        if (participantId !== publicKey.toString()) {
          createPeerConnection(participantId);
        }
      });

      // Add ourselves to the room's participants
      room.participants.set(publicKey.toString(), {
        peerId: publicKey.toString(),
        audioEnabled: true
      });
      
      // Update room member count
      const updatedRoom = {
        ...room,
        memberCount: room.memberCount + 1,
        participants: room.participants
      };

      const updatedRooms = rooms.map(r => 
        r.id === room.id ? updatedRoom : r
      );

      setRooms(updatedRooms);
      localStorage.setItem('voiceRooms', JSON.stringify(updatedRooms));

      // Enable audio by default when joining
      setIsAudioEnabled(true);
    } catch (error) {
      console.error('Error joining room:', error);
      alert(t('room.join.error'));
      
      // Cleanup on error
      localStream?.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    } finally {
      setLoading(false);
    }
  };

  const leaveRoom = () => {
    if (!activeRoom) return;

    // Stop local stream
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);

    // Close and cleanup peer connections
    peerConnectionsRef.current.forEach(peer => {
      peer.connection.close();
    });
    peerConnectionsRef.current.clear();

    // Remove ourselves from the room's participants
    if (publicKey) {
      activeRoom.participants.delete(publicKey.toString());
    }

    // Update room member count and participants
    const updatedRoom = {
      ...activeRoom,
      memberCount: Math.max(0, activeRoom.memberCount - 1),
      participants: activeRoom.participants
    };

    const updatedRooms = rooms.map(r => 
      r.id === activeRoom.id ? updatedRoom : r
    );

    setRooms(updatedRooms);
    localStorage.setItem('voiceRooms', JSON.stringify(updatedRooms));
    setActiveRoom(null);
    setIsAudioEnabled(false);
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Early return if wallet is not connected
  if (!connected || !publicKey) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('wallet.connect.required')}</h2>
          <p className="mb-4">{t('wallet.connect.description')}</p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar - Room List */}
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">{t('voice.rooms')}</h2>
        </div>
        
        {/* Room List */}
        <div className="overflow-y-auto h-full">
          {rooms.map(room => (
            <div
              key={room.id}
              className={`p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                activeRoom?.id === room.id ? 'bg-zinc-100 dark:bg-zinc-800' : ''
              }`}
              onClick={() => !activeRoom && joinRoom(room)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{room.name}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {room.memberCount ?? 0} {t('participants')}
                  </p>
                </div>
                {room.participants?.has(publicKey?.toString() || '') && (
                  <div className="w-2 h-2 rounded-full bg-[#25d366]" />
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Create Room Form */}
        {connected && (
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
            <Input
              placeholder={t('room.name')}
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              className="mb-2"
            />
            <Input
              placeholder={t('required.nft')}
              value={nftAddress}
              onChange={e => setNftAddress(e.target.value)}
              className="mb-2"
            />
            <Button
              onClick={createRoom}
              disabled={loading || !newRoomName || !nftAddress}
              className="w-full"
            >
              {t('create.room')}
            </Button>
          </div>
        )}
      </div>

      {/* Main Content - Active Room */}
      <div className="flex-1 flex flex-col">
        {!connected ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6 max-w-md">
              <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-4 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 mb-4">
                {t('connect.wallet.rooms')}
              </div>
              <div className="flex justify-center">
                <WalletMultiButton />
              </div>
            </div>
          </div>
        ) : activeRoom ? (
          <>
            {/* Room Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{activeRoom?.name}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {activeRoom?.participants?.size ?? 0} {t('participants')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!audioPermissionGranted ? (
                  <Button
                    onClick={handleEnableAudio}
                    variant="default"
                  >
                    {t('enable.audio')}
                  </Button>
                ) : (
                  <Button
                    onClick={toggleAudio}
                    variant={isAudioEnabled ? "default" : "secondary"}
                    size="icon"
                  >
                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                )}
                <Button onClick={leaveRoom} variant="destructive">
                  {t('leave.room')}
                </Button>
              </div>
              {audioError && (
                <div className="mt-2 p-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded">
                  {audioError}
                </div>
              )}
            </div>
            
            {/* Participants Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from(activeRoom?.participants?.values() ?? []).map(participant => (
                  <div
                    key={participant.peerId}
                    className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-8 w-8 text-zinc-400" />
                      <div>
                        <p className="font-medium truncate">
                          {participant.peerId.slice(0, 8)}...
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {participant.audioEnabled ? t('mic.on') : t('mic.off')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500 dark:text-zinc-400">
              {t('select.room')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
