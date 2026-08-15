import type { AuthResponse, User } from '@supabase/supabase-js';
import type { Product } from '../types';
import { getSupabaseClient } from '../config/supabase';

export type RemoteCategory = { id: string; name: string; description: string | null; active: boolean; sort_order: number };
export type RemoteOrder = { id: string; order_number: string; customer_name: string; customer_email: string | null; shipping_address: Record<string, unknown>; status: string; payment_status: string; total: number; created_at: string; order_items?: Array<{ quantity: number; selling_price: number; cost_price: number }> };
export type RemoteExpense = { id: string; title: string; category: string; amount: number; expense_date: string };

const supabase = () => getSupabaseClient();

export async function signInAdmin(email: string, password: string): Promise<AuthResponse> {
  return supabase().auth.signInWithPassword({ email: email.trim(), password });
}

export async function signOutAdmin() {
  await supabase().auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase().auth.getUser();
  return data.user ?? null;
}

export async function loadCategories(): Promise<RemoteCategory[]> {
  const { data, error } = await supabase().from('categories').select('id,name,description,active,sort_order').order('sort_order');
  if (error) throw error;
  return data ?? [];
}

const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `category-${Date.now()}`;

export async function upsertCategory(category: Pick<RemoteCategory, 'name' | 'description' | 'active'> & { id?: string; sort_order?: number }) {
  const payload = {
    name: category.name.trim(),
    slug: slugify(category.name),
    description: category.description?.trim() || null,
    active: category.active,
    sort_order: category.sort_order ?? 0,
  };
  const request = category.id ? supabase().from('categories').update(payload).eq('id', category.id).select('id,name,description,active,sort_order').single() : supabase().from('categories').insert(payload).select('id,name,description,active,sort_order').single();
  const { data, error } = await request;
  if (error) throw error;
  return data as RemoteCategory;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase().from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function loadProducts(): Promise<Product[]> {
  const { data, error } = await supabase().from('products').select('id,name,description,price,discount_price,original_price,category,image_url,images,colors,stock,featured,created_at,updated_at,category_id,cost_price').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((product: Product & { category_id?: string; cost_price?: number }) => ({ ...product, images: product.images ?? [], colors: product.colors ?? [], image_url: product.image_url ?? '', category: product.category ?? '' }));
}

export async function saveProduct(product: Product & { cost_price?: number; category_id?: string | null; published?: boolean }) {
  const payload = {
    name: product.name.trim(),
    description: product.description?.trim() || null,
    price: Number(product.price) || 0,
    discount_price: product.discount_price == null ? null : Number(product.discount_price),
    original_price: product.original_price == null ? null : Number(product.original_price),
    category: product.category?.trim() || null,
    category_id: product.category_id ?? null,
    image_url: product.image_url?.trim() || null,
    images: product.images ?? [],
    colors: product.colors ?? [],
    stock: Number(product.stock) || 0,
    featured: Boolean(product.featured),
    cost_price: Number(product.cost_price) || 0,
    published: product.published ?? true,
    updated_at: new Date().toISOString(),
  };
  const request = product.id ? supabase().from('products').update(payload).eq('id', product.id).select('id,name,description,price,discount_price,original_price,category,image_url,images,colors,stock,featured,created_at,updated_at,category_id,cost_price,published').single() : supabase().from('products').insert(payload).select('id,name,description,price,discount_price,original_price,category,image_url,images,colors,stock,featured,created_at,updated_at,category_id,cost_price,published').single();
  const { data, error } = await request;
  if (error) throw error;
  return { ...(data as Product), images: data.images ?? [], colors: data.colors ?? [], image_url: data.image_url ?? '', category: data.category ?? '' } as Product;
}

export async function deleteProduct(id: string | number) {
  const { error } = await supabase().from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadProductImage(file: File, onProgress?: (progress: number) => void) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${crypto.randomUUID()}.${extension}`;
  onProgress?.(20);
  const { error } = await supabase().storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;
  onProgress?.(80);
  const { data } = supabase().storage.from('product-images').getPublicUrl(path);
  onProgress?.(100);
  return data.publicUrl;
}

export async function loadOrders(): Promise<RemoteOrder[]> {
  const { data, error } = await supabase().from('orders').select('id,order_number,customer_name,customer_email,shipping_address,status,payment_status,total,created_at,order_items(quantity,selling_price,cost_price)').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function updateOrderStatus(id: string, status: string, previousStatus?: string) {
  const { error } = await supabase().from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  const { error: historyError } = await supabase().from('order_status_history').insert({ order_id: id, from_status: previousStatus ?? null, to_status: status.toLowerCase(), });
  if (historyError) throw historyError;
}

export async function loadExpenses(): Promise<RemoteExpense[]> {
  const { data, error } = await supabase().from('expenses').select('id,title,category,amount,expense_date').order('expense_date', { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(expense: Omit<RemoteExpense, 'id'>) {
  const { data, error } = await supabase().from('expenses').insert({ title: expense.title, category: expense.category, amount: expense.amount, expense_date: expense.expense_date }).select().single();
  if (error) throw error;
  return data as RemoteExpense;
}

export function subscribeToOrders(onChange: () => void) {
  return supabase().channel('admin-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange).subscribe();
}

export function subscribeToCatalogue(onChange: () => void) {
  return supabase()
    .channel('public-catalogue')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, onChange)
    .subscribe();
}

export async function createStorefrontOrder(input: { customerName: string; customerEmail?: string; address: Record<string, unknown>; items: Array<{ productId: number; name: string; quantity: number; sellingPrice: number; costPrice: number }>; shippingFee?: number }) {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.sellingPrice, 0);
  const orderNumber = `CNS-${Date.now().toString().slice(-8)}`;
  const { data: order, error } = await supabase().from('orders').insert({ order_number: orderNumber, customer_name: input.customerName, customer_email: input.customerEmail ?? null, shipping_address: input.address, subtotal, shipping_fee: input.shippingFee ?? 0, total: subtotal + (input.shippingFee ?? 0), status: 'pending', payment_status: 'pending' }).select().single();
  if (error) throw error;
  const { error: itemsError } = await supabase().from('order_items').insert(input.items.map(item => ({ order_id: order.id, product_id: item.productId, product_name: item.name, quantity: item.quantity, selling_price: item.sellingPrice, cost_price: item.costPrice })));
  if (itemsError) throw itemsError;
  return order;
}
