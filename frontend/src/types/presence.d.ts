export interface PresenceData {
  address: string;
  status: 'online' | 'offline';
  lastSeen: number;
  publicKey?: string;
  customStatus?: string;
}
