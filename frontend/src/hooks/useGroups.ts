import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { SOLVIO_TOKEN_MINT } from '../config/constants';
import { uploadToIPFS, getFromIPFS, uploadFile } from '../services/ipfs';
import type { Group, GroupMember, GroupMessage } from '../types/group.types';

interface CreateGroupData {
  name: string;
  description?: string;
  requiredNft?: string;
  avatar?: File;
}

export interface GroupHookReturn {
  groups: Group[];
  loading: boolean;
  error: string | undefined;
  createGroup: (data: CreateGroupData) => Promise<void>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  sendMessage: (groupId: string, content: string, replyTo?: string) => Promise<void>;
}

export const useGroups = (): GroupHookReturn => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const { connection } = useConnection();
  const { publicKey, signMessage } = useWallet();

  const verifyNFTOwnership = async (nftAddress: string): Promise<boolean> => {
    if (!publicKey) return false;
    try {
      const nftPubkey = new PublicKey(nftAddress);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: nftPubkey }
      );
      return tokenAccounts.value.length > 0;
    } catch (err) {
      console.error('Error verifying NFT ownership:', err);
      return false;
    }
  };

  const verifySolvioToken = async (): Promise<boolean> => {
    if (!publicKey) return false;
    try {
      const solvioMint = new PublicKey(SOLVIO_TOKEN_MINT);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: solvioMint }
      );
      return tokenAccounts.value.length > 0;
    } catch (err) {
      console.error('Error verifying Solvio token:', err);
      return false;
    }
  };

  const createGroup = async (data: CreateGroupData): Promise<void> => {
    if (!publicKey || !signMessage) throw new Error('Wallet not connected');

    const hasSolvioToken = await verifySolvioToken();
    if (!hasSolvioToken) {
      throw new Error('Solvio token required to create groups');
    }

    try {
      // Upload avatar to IPFS if provided
      let avatarCid;
      if (data.avatar) {
        avatarCid = await uploadFile(data.avatar);
      }

      // Create group metadata
      const groupData = {
        name: data.name,
        description: data.description,
        created_at: new Date().toISOString(),
        created_by: publicKey.toString(),
        required_nft: data.requiredNft,
        avatar_cid: avatarCid,
        members: [{
          wallet_address: publicKey.toString(),
          joined_at: new Date().toISOString(),
          role: 'admin' as const,
        }],
        messages: [],
      };

      // Upload group metadata to IPFS
      const groupCid = await uploadToIPFS(groupData);

      // Update local state
      setGroups(prev => [...prev, { ...groupData, id: groupCid }]);
    } catch (error) {
      console.error('Error creating group:', error);
      throw new Error('Failed to create group');
    }
  };

  const joinGroup = async (groupId: string): Promise<void> => {
    if (!publicKey || !signMessage) throw new Error('Wallet not connected');

    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');

    if (group.required_nft) {
      const hasNFT = await verifyNFTOwnership(group.required_nft);
      if (!hasNFT) {
        throw new Error('Required NFT not found in wallet');
      }
    }

    try {
      // Get current group data from IPFS
      const groupData = await getFromIPFS(groupId);

      // Add member to group
      groupData.members.push({
        wallet_address: publicKey.toString(),
        joined_at: new Date().toISOString(),
        role: 'member',
        nft_proof: group.required_nft ? await verifyNFTOwnership(group.required_nft) : undefined,
      });

      // Upload updated group data to IPFS
      await uploadToIPFS(groupData);

      // Update local state
      setGroups(prev =>
        prev.map(g =>
          g.id === groupId
            ? { ...g, members: groupData.members }
            : g
        )
      );
    } catch (error) {
      console.error('Error joining group:', error);
      throw new Error('Failed to join group');
    }
  };

  const leaveGroup = async (groupId: string): Promise<void> => {
    if (!publicKey || !signMessage) throw new Error('Wallet not connected');

    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');

    try {
      // Get current group data from IPFS
      const groupData = await getFromIPFS(groupId);

      // Remove member from group
      groupData.members = groupData.members.filter(
        (m: GroupMember) => m.wallet_address !== publicKey.toString()
      );

      // Upload updated group data to IPFS
      await uploadToIPFS(groupData);

      // Update local state
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (error) {
      console.error('Error leaving group:', error);
      throw new Error('Failed to leave group');
    }
  };

  const sendMessage = async (
    groupId: string,
    content: string,
    replyTo?: string
  ): Promise<void> => {
    if (!publicKey || !signMessage) throw new Error('Wallet not connected');

    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');

    try {
      // Create message
      const message: GroupMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: publicKey.toString(),
        content,
        timestamp: new Date().toISOString(),
        reply_to: replyTo,
      };

      // Get current group data from IPFS
      const groupData = await getFromIPFS(groupId);

      // Add message to group
      groupData.messages.push(message);

      // Upload updated group data to IPFS
      await uploadToIPFS(groupData);

      // Update local state
      setGroups(prev =>
        prev.map(g =>
          g.id === groupId
            ? { ...g, messages: [...g.messages, message] }
            : g
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  };

  useEffect(() => {
    const loadGroups = async () => {
      if (!publicKey) {
        setGroups([]);
        setLoading(false);
        return;
      }

      try {
        // For now, we'll use a simple array to store group CIDs
        // In a full implementation, these would be stored on-chain
        const groupCids: string[] = [];
        
        const loadedGroups = await Promise.all(
          groupCids.map(async (cid): Promise<Group> => {
            const groupData = await getFromIPFS(cid);
            return {
              id: cid,
              name: groupData.name,
              description: groupData.description,
              created_at: groupData.created_at,
              created_by: groupData.created_by,
              required_nft: groupData.required_nft,
              members: groupData.members || [],
              messages: groupData.messages || []
            };
          })
        );

        setGroups(loadedGroups);
        setLoading(false);
      } catch (err) {
        console.error('Error loading groups:', err);
        setError('Failed to load groups');
        setLoading(false);
      }
    };

    loadGroups();
  }, [publicKey, connection]);

  const hookReturn: GroupHookReturn = {
    groups,
    loading,
    error,
    createGroup,
    joinGroup,
    leaveGroup,
    sendMessage
  };

  return hookReturn;
}
