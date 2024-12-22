import * as React from 'react';
import { useCallback } from 'react';
import { Crown, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTokenVerification } from '../hooks/useTokenVerification';
import { useLanguage } from '../contexts/LanguageContext';
import { uploadToIPFS, getFromIPFS } from '../services/ipfs';

import type { Room } from '../types/room.d';

export function PrivateRooms() {
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = React.useState('');
  const [joiningRoom, setJoiningRoom] = React.useState<string | null>(null);
  const { publicKey } = useWallet();
  const { t } = useLanguage();
  const { hasPaid, isLoading } = useTokenVerification();
  const hasToken = hasPaid; // Maintain consistent naming throughout component

  // WebSocket message handler for room updates
  React.useEffect(() => {
    if (!window.solvioWs) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === 'room_update') {
        setRooms(prevRooms => 
          prevRooms.map(room => 
            room.id === data.roomId 
              ? { ...room, currentParticipants: data.participants }
              : room
          )
        );
      } else if (data.type === 'new_room') {
        setRooms(prevRooms => [...prevRooms, data.room]);
      }
    };

    window.solvioWs.addEventListener('message', handleMessage);
    return () => window.solvioWs?.removeEventListener('message', handleMessage);
  }, []);

  const createRoom = useCallback(async () => {
    if (!publicKey || !newRoomName.trim()) return;
    
    try {
      // Store room data in IPFS for decentralized persistence
      const roomData = {
        id: Date.now().toString(),
        name: newRoomName,
        maxParticipants: hasToken ? 100 : 10, // Premium users get larger group size
        currentParticipants: 1,
        isPremium: hasToken,
        creator: publicKey.toBase58(),
        attachmentTypes: hasToken ? ['image', 'video', 'document', 'voice'] : ['image'], // Premium users get more attachment types
        createdAt: Date.now()
      };

      // Store room data in IPFS
      const ipfsCid = await uploadToIPFS(JSON.stringify(roomData));
      const roomWithCid = { ...roomData, ipfsCid };

      // Send room creation message via WebSocket for decentralized sync
      if (window.solvioWs?.readyState === WebSocket.OPEN) {
        window.solvioWs.send(JSON.stringify({
          type: 'create_room',
          room: roomWithCid,
          creator: publicKey.toBase58()
        }));
      }

      setRooms(prev => [...prev, roomWithCid]);
      setNewRoomName('');
    } catch (error) {
      console.error('Error creating room:', error);
      alert(t('error.room.create'));
    }
  }, [publicKey, newRoomName, hasToken, t]);

  const joinRoom = useCallback(async (roomId: string) => {
    if (!publicKey) return;

    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    // Check if room is full
    if (room.currentParticipants >= room.maxParticipants) {
      alert(t('error.room.full'));
      return;
    }

    // Check if premium room requires token
    if (room.isPremium && !hasToken) {
      alert(t('error.token.required.premium'));
      return;
    }

    try {
      // Get latest room data from IPFS if available
      if (room.ipfsCid) {
        const updatedRoomData = await getFromIPFS(room.ipfsCid);
        
        // Parse and validate room data with proper type handling
        const parseRoom = (data: string | Record<string, unknown>): Room => {
          const parsed = typeof data === 'string' ? JSON.parse(data) as Record<string, unknown> : data;
          
          // Validate required fields with type checking
          if (typeof parsed.id !== 'string' ||
              typeof parsed.name !== 'string' ||
              typeof parsed.maxParticipants !== 'number' ||
              typeof parsed.currentParticipants !== 'number' ||
              typeof parsed.isPremium !== 'boolean' ||
              typeof parsed.creator !== 'string' ||
              !Array.isArray(parsed.attachmentTypes) ||
              typeof parsed.createdAt !== 'number') {
            throw new Error('Invalid room data format');
          }
          
          return {
            id: parsed.id,
            name: parsed.name,
            maxParticipants: parsed.maxParticipants,
            currentParticipants: parsed.currentParticipants,
            isPremium: parsed.isPremium,
            creator: parsed.creator,
            attachmentTypes: parsed.attachmentTypes as string[],
            createdAt: parsed.createdAt,
            ipfsCid: typeof parsed.ipfsCid === 'string' ? parsed.ipfsCid : undefined
          };
        };

        // Parse and validate room data
        const parsedRoomData = parseRoom(updatedRoomData);

        if (!parsedRoomData || typeof parsedRoomData !== 'object' || !('id' in parsedRoomData)) {
          throw new Error('Invalid room data format');
        }
        
        if (parsedRoomData.currentParticipants >= parsedRoomData.maxParticipants) {
          alert(t('error.room.full'));
          return;
        }
      }

      if (window.solvioWs?.readyState === WebSocket.OPEN) {
        window.solvioWs.send(JSON.stringify({
          type: 'join_room',
          roomId,
          participant: publicKey.toBase58()
        }));
      }
      setJoiningRoom(roomId);
    } catch (error) {
      console.error('Error joining room:', error);
      alert(t('error.room.join'));
    }
  }, [publicKey, rooms, hasToken, t]);

  // Load rooms from WebSocket on mount
  React.useEffect(() => {
    if (!window.solvioWs) return;

    // Request room list
    window.solvioWs.send(JSON.stringify({
      type: 'get_rooms'
    }));

    // Handle room list response
    const handleRoomList = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === 'room_list') {
        setRooms(data.rooms);
      }
    };

    window.solvioWs.addEventListener('message', handleRoomList);
    return () => window.solvioWs?.removeEventListener('message', handleRoomList);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{t('private.rooms')}</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          {hasToken ? t('premium.rooms.description') : t('rooms.description')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-4">
          <Input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder={t('room.name.placeholder')}
            className="flex-1"
          />
          <Button onClick={createRoom}>{t('button.create.room')}</Button>
        </div>

        <div className="space-y-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-center space-x-4">
                {room.isPremium && <Crown className="h-5 w-5 text-yellow-500" />}
                <div>
                  <h3 className="font-medium">{room.name}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {`${room.currentParticipants}/${room.maxParticipants} ${t('participants')}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{room.currentParticipants}</span>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => joinRoom(room.id)}
                  disabled={joiningRoom === room.id}
                >
                  {joiningRoom === room.id ? t('button.joining') : t('button.join.room')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
