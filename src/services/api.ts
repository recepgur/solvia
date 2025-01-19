import axios from 'axios';
import { Listing, Location, SwipeRequest, ApiResponse, Category, ItemCondition } from '../types';

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://app-hbycamzu.fly.dev';
const TOKEN_KEY = '@auth_token';

export const api = {
  async login(email: string, password: string): Promise<ApiResponse<{ token: string }>> {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username: email,
        password,
      });
      const { access_token } = response.data;
      await AsyncStorage.setItem(TOKEN_KEY, access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return { data: { token: access_token } };
    } catch (error) {
      console.error('Error logging in:', error);
      return { error: 'Invalid email or password' };
    }
  },

  async register(username: string, email: string, password: string): Promise<ApiResponse<void>> {
    try {
      await axios.post(`${API_URL}/api/auth/register`, {
        username,
        email,
        password,
      });
      return {};
    } catch (error) {
      console.error('Error registering:', error);
      return { error: 'Registration failed' };
    }
  },

  async getNearbyListings(
    location: Location,
    filters?: {
      category?: Category;
      condition?: ItemCondition;
      radius?: number;
    }
  ): Promise<ApiResponse<Listing[]>> {
    try {
      const params = new URLSearchParams({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        radius: (filters?.radius || 10).toString(),
      });

      if (filters?.category) {
        params.append('category', filters.category);
      }
      if (filters?.condition) {
        params.append('condition', filters.condition);
      }

      const response = await axios.get(`${API_URL}/api/listings/feed?${params}`);
      return { data: response.data.listings };
    } catch (error) {
      console.error('Error fetching listings:', error);
      return { error: 'Failed to fetch nearby listings' };
    }
  },

  async swipeListing(listingId: string, request: SwipeRequest): Promise<ApiResponse<void>> {
    try {
      await axios.post(`${API_URL}/api/listings/${listingId}/swipe`, request);
      return {};
    } catch (error) {
      console.error('Error recording swipe:', error);
      return { error: 'Failed to record swipe action' };
    }
  },
};
