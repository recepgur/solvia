export interface Room {
  id: string;
  name: string;
  maxParticipants: number;
  currentParticipants: number;
  isPremium: boolean;
  ipfsCid?: string;
  creator: string;
  attachmentTypes: string[];
  createdAt: number;  // Using number for timestamp consistency
  encryptionKey?: string;  // Optional encryption key for room messages
  chainId?: string;  // For multi-chain support
  nftRequirement?: {
    contractAddress: string;
    minBalance: number;
  };
}
