export interface Status {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  media: string;
  mediaHash?: string; // IPFS hash for media content
  type: 'image' | 'video' | 'text';
  timestamp: number;
  expiresAt: number; // 24h after timestamp
  viewers?: string[]; // Array of wallet addresses that have viewed the status
  mediaType?: string; // MIME type of the media
}

export interface StatusUpdate {
  type: 'status_update';
  status: Status;
  action: 'create' | 'view' | 'expire';
}
