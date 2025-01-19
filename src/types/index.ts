export interface Location {
  latitude: number;
  longitude: number;
}

export interface CarListing {
  id?: string;
  title: string;
  price: number;
  description: string;
  location: Location;
  image_url: string;
  created_at?: string;
}

export type SwipeAction = 'like' | 'dislike';

export interface SwipeRequest {
  user_id: string;
  action: SwipeAction;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
