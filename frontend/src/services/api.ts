import axios from 'axios';
import { Listing, Location, SwipeRequest, UserLogin, UserRegister } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('VITE_API_URL environment variable is not set');
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (credentials: UserLogin) => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  register: async (userData: UserRegister) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

export const listingsApi = {
  getFeed: async (location: Location, filters?: {
    category?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    radius?: number;
  }) => {
    const params = new URLSearchParams();
    params.append('latitude', location.latitude.toString());
    params.append('longitude', location.longitude.toString());
    if (filters?.category) params.append('category', filters.category);
    if (filters?.condition) params.append('condition', filters.condition);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters?.radius) params.append('radius', filters.radius.toString());
    const response = await api.get(`/api/listings/feed?${params}`);
    return response.data;
  },

  swipe: async (listingId: string, action: SwipeRequest) => {
    const response = await api.post(`/api/listings/${listingId}/swipe`, action);
    return response.data;
  },

  createListing: async (listing: Omit<Listing, 'id' | 'created_at'>) => {
    const response = await api.post('/api/listings', listing);
    return response.data;
  },
};

export default api;
