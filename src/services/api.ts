import axios from 'axios';
import { CarListing, Location, SwipeRequest, ApiResponse } from '../types';

const API_URL = 'https://app-hbycamzu.fly.dev';

export const api = {
  async getNearbyListings(location: Location, radius: number = 10): Promise<ApiResponse<CarListing[]>> {
    try {
      const response = await axios.get(
        `${API_URL}/api/listings/feed?user_id=test-user&latitude=${location.latitude}&longitude=${location.longitude}&radius=${radius}`
      );
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
