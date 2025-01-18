// Mock data for development and testing
// TODO: Replace with actual data from blockchain/backend

export const MOCK_PUBLIC_KEY = "11111111111111111111111111111111";

export interface ChatPreview {
  publicKey: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

export const MOCK_CHATS: ChatPreview[] = [
  {
    publicKey: '8xyt...9j2k',
    lastMessage: 'Hey, how are you?',
    timestamp: '10:30 AM',
    unread: 2,
  },
  {
    publicKey: '3mnb...7h4d',
    lastMessage: 'Did you receive the files?',
    timestamp: '9:45 AM',
    unread: 0,
  },
  {
    publicKey: '5qrs...2w8p',
    lastMessage: 'Meeting at 3 PM',
    timestamp: 'Yesterday',
    unread: 1,
  },
];
