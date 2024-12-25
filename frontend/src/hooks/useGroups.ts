import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { SOLVIO_TOKEN_MINT } from '../config/constants';
import { uploadToIPFS, getFromIPFS, uploadFile } from '../services/ipfs';
import type { Group, GroupMember, GroupMessage } from '../types/group';

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
  promoteToAdmin: (groupId: string, memberId: string) => Promise<void>;
  demoteFromAdmin: (groupId: string, memberId: string) => Promise<void>;
  muteMember: (groupId: string, memberId: string, duration: number) => Promise<void>;
  banMember: (groupId: string, memberId: string) => Promise<void>;
}

export const useGroups = (): GroupHookReturn => {
  const [groups, setGroups] = useState<Group[]>(() => {
    // Initialize with mock data in development
    if (process.env.NODE_ENV === 'development' && process.env.VITE_MOCK_DATA === 'true') {
      console.log('Initializing mock groups data');
      const timestamp = Math.floor(Date.now() / 1000);
      const mockWalletAddress = 'mock-wallet-address';
      const mockGroupId = `test-group-${timestamp}`;
      
      const mockGroup: Group = {
        id: mockGroupId,
        name: 'Test Group',
        description: 'Test group for development',
        created_at: timestamp,
        created_by: mockWalletAddress,
        required_nft: undefined,
        members: [{
          wallet_address: mockWalletAddress,
          role: 'admin' as const,
          joined_at: timestamp,
          publicKey: mockWalletAddress,
          lastActive: timestamp,
          nft_proof: undefined
        }],
        messages: [{
          id: `test-message-${timestamp}`,
          sender: mockWalletAddress,
          content: 'Welcome to the test group!',
          timestamp: timestamp,
          reply_to: undefined
        }],
        chainId: '1',
        ipfsCid: mockGroupId
      };
      return [mockGroup];
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
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
      if (data.avatar) {
        await uploadFile(data.avatar);
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const walletAddress = publicKey.toString();

      // Create group metadata that matches Group interface
      const groupData: Group = {
        id: '', // Will be set to groupCid
        name: data.name,
        description: data.description || '',
        created_at: timestamp,
        created_by: walletAddress,
        required_nft: data.requiredNft,
        members: [{
          wallet_address: walletAddress,
          joined_at: timestamp,
          role: 'admin' as const,
          publicKey: walletAddress,
          lastActive: timestamp,
          nft_proof: undefined
        }],
        messages: [],
        chainId: '1',
        ipfsCid: ''
      };

      // Upload group metadata to IPFS
      const groupCid = await uploadToIPFS(groupData);
      groupData.id = groupCid;
      groupData.ipfsCid = groupCid;

      // Update local state with properly typed group data
      setGroups(prev => [...prev, groupData]);
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
      const groupData = await getFromIPFS<Group>(groupId);

      // Add member to group
      groupData.members.push({
        wallet_address: publicKey.toString(),
        joined_at: Math.floor(Date.now() / 1000),
        role: 'member',
        nft_proof: group.required_nft ? group.required_nft : undefined,
        lastActive: Math.floor(Date.now() / 1000)
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
      const groupData = await getFromIPFS<Group>(groupId);

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
      // Generate message ID with safe string operations
      const timestamp = Math.floor(Date.now() / 1000);
      const randomNum = Math.floor(Math.random() * 1000000);
      const messageId = `msg-${timestamp}-${randomNum}`;
      console.log('[useGroups] Generated message ID:', messageId);
      
      const message: GroupMessage = {
        id: messageId,
        sender: publicKey.toString(),
        content,
        timestamp,
        reply_to: replyTo,
      };

      // Get current group data from IPFS
      const groupData = await getFromIPFS<Group>(groupId);

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
      console.log('[useGroups] Starting loadGroups with state:', {
        publicKey: publicKey?.toString() || 'none',
        environment: process.env.NODE_ENV,
        mockData: process.env.VITE_MOCK_DATA,
        currentGroups: Array.isArray(groups) ? groups.length : 'invalid'
      });
      
      setLoading(true);
      setError(undefined); // Reset error state
      
      try {
        // Ensure we have the required environment variables
        if (!process.env.NODE_ENV) {
          console.error('[useGroups] Missing NODE_ENV');
          throw new Error('Missing environment configuration');
        }
        
        // In development mode, always load mock data
        // Always use mock data in development
        if (process.env.NODE_ENV === 'development' && process.env.VITE_MOCK_DATA === 'true') {
          console.log('Development mode with mock data enabled - loading mock data');
          console.log('Environment:', { NODE_ENV: process.env.NODE_ENV, VITE_MOCK_DATA: process.env.VITE_MOCK_DATA });
          // Generate safe mock data
          const timestamp = Math.floor(Date.now() / 1000);
          const mockWalletAddress = publicKey?.toString() || `mock-wallet-${timestamp}`;
          const mockGroupId = `test-group-${timestamp}`;
          
          console.log('[useGroups] Generating mock data with:', {
            mockWalletAddress,
            mockGroupId,
            timestamp
          });
          
          // Mock data for development with guaranteed ID and messages
          const mockGroupData: Group = {
            id: mockGroupId,
            name: 'Test Group',
            description: 'Test group for development',
            created_at: Math.floor(Date.now() / 1000),
            created_by: mockWalletAddress,
            required_nft: undefined,
            members: [{
              wallet_address: mockWalletAddress,
              role: 'admin',
              joined_at: Math.floor(Date.now() / 1000),
              publicKey: mockWalletAddress,
              lastActive: Math.floor(Date.now() / 1000)
            }],
            messages: [{
              id: `test-message-${Date.now()}`,
              sender: mockWalletAddress,
              content: 'Welcome to the test group!',
              timestamp: Math.floor(Date.now() / 1000),
              reply_to: undefined
            }],
            chainId: '1',
            ipfsCid: mockGroupId
          };
          
          // Validate mock group data before using it
          if (!mockGroupData || typeof mockGroupData !== 'object') {
            console.error('[useGroups] Invalid mock group data structure');
            throw new Error('Invalid mock group data');
          }

          // Ensure all required fields are present and properly typed
          const validatedGroup = {
            ...mockGroupData,
            id: mockGroupId,
            name: mockGroupData.name || 'Test Group',
            description: mockGroupData.description || '',
            created_at: timestamp,
            created_by: mockWalletAddress,
            members: Array.isArray(mockGroupData.members) ? mockGroupData.members : [],
            messages: Array.isArray(mockGroupData.messages) ? mockGroupData.messages : [],
            chainId: mockGroupData.chainId || '1',
            ipfsCid: mockGroupId
          };

          console.log('[useGroups] Setting validated mock group:', validatedGroup);
          
          // Set groups with defensive wrapper
          setGroups([validatedGroup].map(group => ({
            ...group,
            messages: Array.isArray(group.messages) ? group.messages : [],
            members: Array.isArray(group.members) ? group.members : []
          })));
          
          setLoading(false);
          console.log('[useGroups] Development mode initialization complete');
          return;
        }
        
        // Production mode - require wallet connection
        if (!publicKey) {
          console.log('Production mode - no wallet connected');
          setGroups([]);
          setLoading(false);
          return;
        }

        // Production implementation would go here
        console.log('Production mode - loading real data');
        const groupCids: string[] = ['test-group-1'];
        console.log('Loading groups with CIDs:', groupCids);
        // Ensure we have valid group CIDs before mapping
        const validGroupCids = Array.isArray(groupCids) ? groupCids : [];
        console.log('Validated group CIDs:', validGroupCids);
        
        const loadedGroups = validGroupCids.map((cid): Group => ({
          id: cid,
          name: 'Production Group',
          description: 'Real group data would be loaded here',
          created_at: Math.floor(Date.now() / 1000),
          created_by: publicKey.toString(),
          required_nft: undefined,
          members: [{
            wallet_address: publicKey.toString(),
            joined_at: Math.floor(Date.now() / 1000),
            role: 'admin' as const,
            publicKey: publicKey.toString(),
            lastActive: Math.floor(Date.now() / 1000),
            nft_proof: undefined
          }],
          messages: [],
          chainId: '1',
          ipfsCid: cid
        }));

        setGroups(loadedGroups);
        setLoading(false);
      } catch (err) {
        console.error('Error loading groups:', err);
        setError('Failed to load groups');
        setLoading(false);
      }
    };

    loadGroups();
  }, [publicKey]);

  // Handle WebSocket connection error
  useEffect(() => {
    const handleWebSocketError = (error: Event) => {
      console.error('WebSocket connection error:', error);
      setError('Connection error. Please try again later.');
    };

    window.addEventListener('websocketerror', handleWebSocketError);
    return () => window.removeEventListener('websocketerror', handleWebSocketError);
  }, []);

  // Ensure groups is always an array and has required properties
  const safeGroups = Array.isArray(groups) ? groups.map(group => ({
    ...group,
    messages: Array.isArray(group.messages) ? group.messages : [],
    members: Array.isArray(group.members) ? group.members : []
  })) : [];

  const promoteToAdmin = async (groupId: string, memberId: string): Promise<void> => {
    if (!publicKey || !signMessage) throw new Error('Wallet not connected');

    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');

    // Verify current user is admin
    const currentUser = group.members.find(m => m.wallet_address === publicKey.toString());
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only admins can promote members');
    }

    try {
      // Get current group data from IPFS
      const groupData = await getFromIPFS<Group>(groupId);

      // Update member role
      const memberIndex = groupData.members.findIndex(m => m.wallet_address === memberId);
      if (memberIndex === -1) throw new Error('Member not found');

      groupData.members[memberIndex].role = 'admin';

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
      console.error('Error promoting member:', error);
      throw new Error('Failed to promote member');
    }
  };

  const demoteFromAdmin = async (groupId: string, memberId: string): Promise<void> => {
    if (!publicKey || !signMessage) throw new Error('Wallet not connected');

    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');

    // Verify current user is admin
    const currentUser = group.members.find(m => m.wallet_address === publicKey.toString());
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only admins can demote members');
    }

    try {
      // Get current group data from IPFS
      const groupData = await getFromIPFS<Group>(groupId);

      // Update member role
      const memberIndex = groupData.members.findIndex(m => m.wallet_address === memberId);
      if (memberIndex === -1) throw new Error('Member not found');

      groupData.members[memberIndex].role = 'member';

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
      console.error('Error demoting member:', error);
      throw new Error('Failed to demote member');
    }
  };

  const muteMember = async (groupId: string, memberId: string, duration: number): Promise<void> => {
    if (!publicKey || !signMessage) throw new Error('Wallet not connected');

    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');

    // Verify current user is admin
    const currentUser = group.members.find(m => m.wallet_address === publicKey.toString());
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only admins can mute members');
    }

    try {
      // Get current group data from IPFS
      const groupData = await getFromIPFS<Group>(groupId);

      // Update member mute status
      const memberIndex = groupData.members.findIndex(m => m.wallet_address === memberId);
      if (memberIndex === -1) throw new Error('Member not found');

      const muteUntil = Math.floor(Date.now() / 1000) + duration;
      groupData.members[memberIndex].muted_until = muteUntil;

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
      console.error('Error muting member:', error);
      throw new Error('Failed to mute member');
    }
  };

  const banMember = async (groupId: string, memberId: string): Promise<void> => {
    if (!publicKey || !signMessage) throw new Error('Wallet not connected');

    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');

    // Verify current user is admin
    const currentUser = group.members.find(m => m.wallet_address === publicKey.toString());
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only admins can ban members');
    }

    try {
      // Get current group data from IPFS
      const groupData = await getFromIPFS<Group>(groupId);

      // Update member ban status
      const memberIndex = groupData.members.findIndex(m => m.wallet_address === memberId);
      if (memberIndex === -1) throw new Error('Member not found');

      groupData.members[memberIndex].banned = true;

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
      console.error('Error banning member:', error);
      throw new Error('Failed to ban member');
    }
  };

  const hookReturn: GroupHookReturn = {
    groups: safeGroups,
    loading,
    error,
    createGroup,
    joinGroup,
    leaveGroup,
    sendMessage,
    promoteToAdmin,
    demoteFromAdmin,
    muteMember,
    banMember
  };

  console.log('Returning hook state:', hookReturn);
  return hookReturn;
}
