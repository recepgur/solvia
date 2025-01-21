import { REACT_APP_API_URL, REACT_APP_WS_URL } from '@env';

class ApiService {
  private baseUrl: string;
  private wsUrl: string;

  constructor() {
    this.baseUrl = REACT_APP_API_URL;
    this.wsUrl = REACT_APP_WS_URL;
  }

  async get(endpoint: string, options?: { params?: Record<string, any> }) {
    try {
      let url = `${this.baseUrl}${endpoint}`;
      if (options?.params) {
        const params = new URLSearchParams();
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
        url += `?${params.toString()}`;
      }
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('API GET error:', error);
      throw error;
    }
  }

  async post(endpoint: string, data: any) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error('API POST error:', error);
      throw error;
    }
  }

  async sendMessage(message: any) {
    return this.post('/api/v1/messages', message);
  }

  async uploadMedia(file: any) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/messages/media`, {
        method: 'POST',
        body: formData,
      });
      return await response.json();
    } catch (error) {
      console.error('Media upload error:', error);
      throw error;
    }
  }

  getWebSocketUrl(userId: string): string {
    return `${this.wsUrl}/${userId}`;
  }
}

export default new ApiService();
