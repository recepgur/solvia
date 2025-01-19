export interface Location {
  latitude: number;
  longitude: number;
}

export enum Category {
  REAL_ESTATE = "real_estate",
  VEHICLE = "vehicle",
  ELECTRONICS = "electronics",
  OTHER = "other"
}

export enum ItemCondition {
  NEW = "new",
  USED = "used"
}

export interface Listing {
  id?: string;
  title: string;
  price: number;
  description: string;
  location: Location;
  image_urls: string[];
  category: Category;
  condition: ItemCondition;
  category_specific: Record<string, any>;
  created_at?: string;
  seller_id?: string;
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
