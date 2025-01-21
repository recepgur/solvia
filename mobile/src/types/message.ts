export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  timestamp: number;
  encryption_key?: string;
  decrypted_content?: string;
  media_url?: string | undefined;
  media_type?: string | undefined;
  group_id?: string;
  message_hash?: string;
  signature?: string;
}
