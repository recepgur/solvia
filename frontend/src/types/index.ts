import { z } from "zod";

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

export interface Location {
  latitude: number;
  longitude: number;
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

export interface User {
  id: string;
  username: string;
  email: string;
  location?: Location;
  created_at: string;
}

export const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type UserLogin = z.infer<typeof userSchema>;

export const userRegisterSchema = userSchema.extend({
  username: z.string().min(3),
});

export type UserRegister = z.infer<typeof userRegisterSchema>;

export type SwipeAction = 'like' | 'dislike';

export interface SwipeRequest {
  action: SwipeAction;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
