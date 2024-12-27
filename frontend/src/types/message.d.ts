export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  type: 'text' | 'media';
  mediaHash?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file';
  status: 'sent' | 'delivered' | 'read';
}

export interface Chat {
  id: string;
  name: string;
  lastMessage: Message;
  unread: number;
  avatar?: string;
}
