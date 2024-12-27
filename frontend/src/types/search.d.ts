export interface SearchOptions {
  query: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  mediaTypes?: ('text' | 'image' | 'video' | 'audio' | 'file')[];
  sender?: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface SearchResult {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  type: 'text' | 'media';
  mediaHash?: string;
  mediaType?: string;
  status: 'sent' | 'delivered' | 'read';
}
