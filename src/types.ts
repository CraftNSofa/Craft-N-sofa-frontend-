export interface ProductVariant {
  name: string;
  options: string[];
}

export interface Product {
  id?: string | number;
  name: string;
  description: string;
  price: number;
  discount_price: number | null;
  original_price?: number | null;
  category: string;
  image_url: string;
  images: string[];
  colors: string[];
  tags?: string[];
  stock: number;
  featured: boolean;
  variants?: ProductVariant[] | Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface SupabaseConfig {
  url: string;
  apiKey: string;
}

export interface AuthSession {
  token: string | null;
  email: string | null;
  isDemoMode: boolean;
}

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}
