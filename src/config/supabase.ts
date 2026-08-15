import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, SupabaseConfig } from '../types';

export const DEFAULT_SUPABASE_URL = "https://zvkeixogcslxnehplbby.supabase.co";
export const DEFAULT_SUPABASE_KEY = "sb_publishable_dwBpJpE2V4A9g-dvMSvq7A_1uISngdR";

export function getSupabaseConfig(): SupabaseConfig {
  const customUrl = localStorage.getItem('supabase_custom_url');
  const customKey = localStorage.getItem('supabase_custom_key');
  return {
    url: customUrl?.trim() || DEFAULT_SUPABASE_URL,
    apiKey: customKey?.trim() || DEFAULT_SUPABASE_KEY,
  };
}

export function saveSupabaseConfig(url: string, apiKey: string) {
  localStorage.setItem('supabase_custom_url', url.trim());
  localStorage.setItem('supabase_custom_key', apiKey.trim());
}

export function resetSupabaseConfig() {
  localStorage.removeItem('supabase_custom_url');
  localStorage.removeItem('supabase_custom_key');
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';
let lastToken = '';

export function getSupabaseClient(): SupabaseClient {
  const config = getSupabaseConfig();
  const token = localStorage.getItem('supabase_token') || '';

  if (cachedClient && lastUrl === config.url && lastKey === config.apiKey && lastToken === token) {
    return cachedClient;
  }

  lastUrl = config.url;
  lastKey = config.apiKey;
  lastToken = token;

  cachedClient = createClient(config.url, config.apiKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });

  return cachedClient;
}

export function getAuthHeaders(token?: string | null): Record<string, string> {
  const config = getSupabaseConfig();
  const activeToken = token || localStorage.getItem('supabase_token') || '';
  
  const headers: Record<string, string> = {
    'apikey': config.apiKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  return headers;
}

/**
 * Direct file upload to Supabase Storage Bucket ('product-images').
 * Obtains and returns public image URL automatically.
 */
export async function uploadImageToSupabase(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  const config = getSupabaseConfig();
  const supabase = getSupabaseClient();

  const fileExt = file.name.split('.').pop() || 'jpg';
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filePath = `products/${Date.now()}_${cleanFileName}.${fileExt}`;

  let bucketName = 'product-images';

  onProgress?.(30);

  // Upload file to Supabase storage bucket
  const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });

  onProgress?.(80);

  if (error) {
    console.warn('Storage upload error in product-images bucket, trying products bucket:', error.message);
    // Fallback attempt to bucket named 'products'
    bucketName = 'products';
    const altRes = await supabase.storage.from(bucketName).upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (altRes.error) {
      throw new Error(`Supabase Storage Upload Failed: ${error.message}`);
    }
  }

  // Get Public URL for the uploaded image
  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  
  onProgress?.(100);

  if (!publicUrlData?.publicUrl) {
    throw new Error('Could not generate public URL for uploaded file.');
  }

  return publicUrlData.publicUrl;
}

export const INITIAL_SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'sample-1',
    name: 'Modern Velvet Sectional Sofa',
    description: 'Luxurious 5-seater L-shaped velvet sectional sofa with ergonomic lumbar support and high-density foam cushions.',
    price: 125000,
    discount_price: 109999,
    category: 'Corner Sofa',
    image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&q=80&w=800'
    ],
    colors: ['Deep Blue', 'Emerald Green', 'Charcoal Grey'],
    stock: 12,
    featured: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'sample-2',
    name: 'Royal Oak King Size Bed Frame',
    description: 'Crafted from solid kiln-dried Oak with an upholstered button-tufted headboard and under-bed storage drawers.',
    price: 95000,
    discount_price: 88000,
    category: 'Bed',
    image_url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800'
    ],
    colors: ['Walnut', 'Natural Oak'],
    stock: 5,
    featured: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString()
  }
];

export const SUPABASE_SQL_SETUP_SCRIPT = `-- ==========================================
-- CRAFT N SOFA SUPABASE SETUP MIGRATION
-- Execute this script in your Supabase SQL Editor
-- ==========================================

-- 1. Create or ensure the \`products\` table exists with all required fields
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_price NUMERIC(12, 2),
    original_price NUMERIC(12, 2),
    category TEXT NOT NULL DEFAULT 'Furniture',
    image_url TEXT,
    images TEXT[] DEFAULT '{}',
    colors TEXT[] DEFAULT '{}',
    stock INTEGER NOT NULL DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    variants JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public Read Policy
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
CREATE POLICY "Allow public read access to products"
    ON public.products FOR SELECT
    USING (true);

-- Authenticated/Anon Insert/Update/Delete Policy (for admin management)
DROP POLICY IF EXISTS "Allow full access for admin users" ON public.products;
CREATE POLICY "Allow full access for admin users"
    ON public.products FOR ALL
    USING (true)
    WITH CHECK (true);


-- 2. Create Storage Bucket for Product Images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies for \`product-images\` bucket

-- Public Read Access for uploaded images
DROP POLICY IF EXISTS "Public Read Access for product images" ON storage.objects;
CREATE POLICY "Public Read Access for product images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');

-- Insert/Upload Access for product images
DROP POLICY IF EXISTS "Allow uploads to product-images" ON storage.objects;
CREATE POLICY "Allow uploads to product-images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'product-images');

-- Delete Access for product images
DROP POLICY IF EXISTS "Allow deletes from product-images" ON storage.objects;
CREATE POLICY "Allow deletes from product-images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'product-images');
`;
