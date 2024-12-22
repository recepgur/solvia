export interface GroupMember {
  wallet_address: string;
  joined_at: number;  // Changed to number for timestamp consistency
  role: 'admin' | 'member';
  nft_proof?: string;
  publicKey?: string;  // For message encryption
  chainId?: string;  // For multi-chain support
  lastActive?: number;  // For presence tracking
}

export interface GroupMessage {
  id: string;
  sender: string;
  content: string;
  encryptedContent?: string;  // For E2E encryption
  timestamp: number;  // Changed to number for consistency
  reply_to?: string;
  ipfsCid?: string;  // For decentralized storage
  signature?: string;  // For message verification
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_at: number;  // Changed to number for consistency
  created_by: string;
  required_nft?: string;
  members: GroupMember[];
  messages: GroupMessage[];
  encryptionKey?: string;  // Group encryption key
  chainId?: string;  // For multi-chain support
  ipfsCid?: string;  // For decentralized storage
}
