export interface GroupMember {
  wallet_address: string;
  joined_at: string;
  role: 'admin' | 'member';
  nft_proof?: string;
}

export interface GroupMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  reply_to?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
  required_nft?: string;
  members: GroupMember[];
  messages: GroupMessage[];
}
