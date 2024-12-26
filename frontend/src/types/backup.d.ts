export interface BackupData {
  messages: {
    id: string;
    text: string;
    sender: string;
    timestamp: string;
    status: 'sent' | 'delivered' | 'read';
    mediaUrl?: string;
    mediaType?: string;
  }[];
  chats: {
    id: string;
    participants: string[];
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount: number;
  }[];
  groups: {
    id: string;
    name: string;
    members: {
      address: string;
      role: 'admin' | 'member';
    }[];
    lastMessage?: string;
    lastMessageTime?: string;
  }[];
  presence?: {
    address: string;
    lastSeen: number;
    status: 'online' | 'offline';
    deviceId: string;
    priority: number;
  }[];
  timestamp: number;
  version: string;
}

export interface BackupMetadata {
  timestamp: number;
  version: string;
  size: number;
  checksum: string;
}

export interface RestoreOptions {
  mergeStrategy: 'replace' | 'merge';
  includeGroups?: boolean;
  includeMedia?: boolean;
  fromTimestamp?: number;
}
