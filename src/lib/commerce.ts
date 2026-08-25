import type { AuthResponse, User } from '@supabase/supabase-js';
import type { Banner, Product, PromoCard, Tag } from '../types';
import { getSupabaseClient } from '../config/supabase';

export type RemoteCategory = { id: string; name: string; description: string | null; active: boolean; sort_order: number; slug?: string; image_url?: string | null; parent_id?: string | null };
export type RemoteTag = Tag & { description: string | null; created_at?: string; updated_at?: string };
export type RemoteBanner = Banner;
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

export async function loadBanners(): Promise<RemoteBanner[]> {
  const { data, error } = await supabase().from('store_banners').select('id,image_url,alt_text,active,sort_order,created_at,updated_at').order('sort_order').order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function uploadStoreBanner(file: File, altText = 'Craft N Sofa collection') {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `banners/banner-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase().storage.from('brand-assets').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (uploadError) throw uploadError;
  const { data: publicUrl } = supabase().storage.from('brand-assets').getPublicUrl(path);
  const { data, error } = await supabase().from('store_banners').insert({ image_url: publicUrl.publicUrl, alt_text: altText.trim() || 'Craft N Sofa collection', sort_order: 0, active: true }).select('id,image_url,alt_text,active,sort_order,created_at,updated_at').single();
  if (error) throw error;
  return data as RemoteBanner;
}

export async function updateStoreBanner(id: string, changes: Partial<Pick<RemoteBanner, 'alt_text' | 'active' | 'sort_order'>>) {
  const { data, error } = await supabase().from('store_banners').update(changes).eq('id', id).select('id,image_url,alt_text,active,sort_order,created_at,updated_at').single();
  if (error) throw error;
  return data as RemoteBanner;
}

export async function deleteStoreBanner(id: string, imageUrl?: string | null) {
  const { error } = await supabase().from('store_banners').delete().eq('id', id);
  if (error) throw error;
  if (imageUrl) {
    const marker = '/storage/v1/object/public/brand-assets/';
    const path = imageUrl.includes(marker) ? imageUrl.split(marker)[1] : null;
    if (path) await supabase().storage.from('brand-assets').remove([path]);
  }
}

export async function loadCategories(): Promise<RemoteCategory[]> {
  const { data, error } = await supabase().from('categories').select('id,name,slug,description,active,sort_order,image_url,parent_id').order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export type StoreContentBlock = { id: string; title: string; html: string; css: string; image_url: string | null; image_title: string; active: boolean; sort_order: number; created_at?: string; updated_at?: string };
export type StoreBranding = { id: string; logo_url: string | null; custom_html: string; custom_css: string; secondary_image_url: string | null; secondary_image_title: string; content_blocks: StoreContentBlock[]; promo_cards: PromoCard[]; updated_at: string };

const defaultStoreBranding = (): StoreBranding => ({ id: 'default', logo_url: null, custom_html: '', custom_css: '', secondary_image_url: null, secondary_image_title: 'Craft N Sofa collection', content_blocks: [], promo_cards: [], updated_at: new Date(0).toISOString() });
const normalizeStoreBranding = (data: Record<string, unknown> | null): StoreBranding => {
  if (!data) return defaultStoreBranding();
  const storedBlocks = Array.isArray(data.content_blocks) ? data.content_blocks as StoreContentBlock[] : [];
  const legacyBlock: StoreContentBlock[] = storedBlocks.length || !String(data.custom_html || '').trim() ? [] : [{ id: 'legacy-custom-content', title: 'Homepage block', html: String(data.custom_html || ''), css: String(data.custom_css || ''), image_url: null, image_title: '', active: true, sort_order: 0 }];
  return { ...defaultStoreBranding(), ...data, secondary_image_title: String(data.secondary_image_title || 'Craft N Sofa collection'), content_blocks: storedBlocks.length ? storedBlocks : legacyBlock, promo_cards: Array.isArray(data.promo_cards) ? data.promo_cards as PromoCard[] : [] } as StoreBranding;
};

export async function loadStoreBranding(): Promise<StoreBranding> {
  const { data, error } = await supabase().from('store_settings').select(brandingFields).eq('id', 'default').maybeSingle();
  if (error) throw error;
  return normalizeStoreBranding(data as Record<string, unknown> | null);
}

export async function saveStoreContent(content: { custom_html: string; custom_css: string; secondary_image_title: string; content_blocks: StoreContentBlock[] }) {
  const normalizedBlocks = content.content_blocks.map((block, index) => ({ ...block, sort_order: index }));
  const { data, error } = await supabase().from('store_settings').upsert({ id: 'default', custom_html: content.custom_html, custom_css: content.custom_css, secondary_image_title: content.secondary_image_title.trim() || 'Craft N Sofa collection', content_blocks: normalizedBlocks, updated_at: new Date().toISOString() }).select(brandingFields).single();
  if (error) throw error;
  return normalizeStoreBranding(data as Record<string, unknown>);
}

export async function uploadStoreContentImage(file: File, previousUrl?: string | null) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `store-content/asset-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase().storage.from('brand-assets').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (uploadError) throw uploadError;
  const { data: publicUrl } = supabase().storage.from('brand-assets').getPublicUrl(path);
  if (previousUrl) await deleteStoreContentImage(previousUrl);
  return publicUrl.publicUrl;
}

export async function deleteStoreContentImage(imageUrl?: string | null) {
  if (!imageUrl) return;
  const marker = '/storage/v1/object/public/brand-assets/';
  const imagePath = imageUrl.includes(marker) ? imageUrl.split(marker)[1] : null;
  if (imagePath) await supabase().storage.from('brand-assets').remove([imagePath]);
}

export async function uploadSecondaryStoreImage(file: File, previousUrl?: string | null, title = 'Craft N Sofa collection') {
  const publicUrl = await uploadStoreContentImage(file, previousUrl);
  const { data, error } = await supabase().from('store_settings').upsert({ id: 'default', secondary_image_url: publicUrl, secondary_image_title: title.trim() || 'Craft N Sofa collection', updated_at: new Date().toISOString() }).select(brandingFields).single();
  if (error) throw error;
  return normalizeStoreBranding(data as Record<string, unknown>);
}

export async function clearSecondaryStoreImage(previousUrl?: string | null) {
  const { data, error } = await supabase().from('store_settings').upsert({ id: 'default', secondary_image_url: null, updated_at: new Date().toISOString() }).select(brandingFields).single();
  if (error) throw error;
  await deleteStoreContentImage(previousUrl);
  return normalizeStoreBranding(data as Record<string, unknown>);
}

export async function uploadStoreLogo(file: File, previousUrl?: string | null) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `branding/logo-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase().storage.from('brand-assets').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (uploadError) throw uploadError;
  const { data: publicUrl } = supabase().storage.from('brand-assets').getPublicUrl(path);
  const { data, error } = await supabase().from('store_settings').upsert({ id: 'default', logo_url: publicUrl.publicUrl, updated_at: new Date().toISOString() }).select('id,logo_url,updated_at').single();
  if (error) throw error;
  if (previousUrl) {
    const marker = '/storage/v1/object/public/brand-assets/';
    const previousPath = previousUrl.includes(marker) ? previousUrl.split(marker)[1] : null;
    if (previousPath) await supabase().storage.from('brand-assets').remove([previousPath]);
  }
  return data as StoreBranding;
}

export async function clearStoreLogo(previousUrl?: string | null) {
  const { data, error } = await supabase().from('store_settings').upsert({ id: 'default', logo_url: null, updated_at: new Date().toISOString() }).select('id,logo_url,updated_at').single();
  if (error) throw error;
  if (previousUrl) {
    const marker = '/storage/v1/object/public/brand-assets/';
    const previousPath = previousUrl.includes(marker) ? previousUrl.split(marker)[1] : null;
    if (previousPath) await supabase().storage.from('brand-assets').remove([previousPath]);
  }
  return data as StoreBranding;
}

const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `category-${Date.now()}`;

export async function upsertCategory(category: Pick<RemoteCategory, 'name' | 'description' | 'active'> & { id?: string; sort_order?: number; image_url?: string | null; parent_id?: string | null }) {
  const payload = {
    name: category.name.trim(),
    slug: slugify(category.name),
    description: category.description?.trim() || null,
    active: category.active,
    sort_order: category.sort_order ?? 0,
    image_url: category.image_url ?? null,
    parent_id: category.parent_id ?? null,
  };
  const fields = 'id,name,slug,description,active,sort_order,image_url,parent_id';
  const request = category.id ? supabase().from('categories').update(payload).eq('id', category.id).select(fields).single() : supabase().from('categories').insert(payload).select(fields).single();
  const { data, error } = await request;
  if (error) throw error;
  return data as RemoteCategory;
}

export async function uploadCategoryImage(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `categories/category-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase().storage.from('brand-assets').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase().storage.from('brand-assets').getPublicUrl(path).data.publicUrl;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase().from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function loadTags(): Promise<RemoteTag[]> {
  const { data, error } = await supabase().from('tags').select('id,name,description,active,created_at,updated_at').order('name');
  if (error) throw error;
  return data ?? [];
}

const tagSlugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `tag-${Date.now()}`;

export async function upsertTag(tag: Pick<RemoteTag, 'name' | 'description' | 'active'> & { id?: string }) {
  const payload = { name: tag.name.trim(), slug: tagSlugify(tag.name), description: tag.description?.trim() || null, active: tag.active, updated_at: new Date().toISOString() };
  const request = tag.id ? supabase().from('tags').update(payload).eq('id', tag.id).select('id,name,description,active,created_at,updated_at').single() : supabase().from('tags').insert(payload).select('id,name,description,active,created_at,updated_at').single();
  const { data, error } = await request;
  if (error) throw error;
  return data as RemoteTag;
}

export async function deleteTag(id: string) {
  const { error } = await supabase().from('tags').delete().eq('id', id);
  if (error) throw error;
}

export async function loadProducts(): Promise<Product[]> {
  const { data, error } = await supabase().from('products').select('id,name,description,price,discount_price,original_price,category,image_url,images,colors,tags,stock,featured,created_at,updated_at,category_id,cost_price,published').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((product: Product & { category_id?: string; cost_price?: number }) => ({ ...product, images: product.images ?? [], colors: product.colors ?? [], tags: product.tags ?? [], image_url: product.image_url ?? '', category: product.category ?? '' }));
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
    tags: product.tags ?? [],
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


const brandingFields = 'id,logo_url,custom_html,custom_css,secondary_image_url,secondary_image_title,content_blocks,promo_cards,updated_at';

export async function savePromoCards(cards: PromoCard[]) {
  const normalized = cards.map((card, index) => ({ ...card, sort_order: index }));
  const { data, error } = await supabase().from('store_settings').upsert({ id: 'default', promo_cards: normalized, updated_at: new Date().toISOString() }).select(brandingFields).single();
  if (error) throw error;
  return data as StoreBranding;
}

export async function uploadPromoCardImage(file: File, previousUrl?: string | null) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `store-content/promo-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase().storage.from('brand-assets').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (uploadError) throw uploadError;
  const { data: publicUrl } = supabase().storage.from('brand-assets').getPublicUrl(path);
  if (previousUrl) {
    const marker = '/storage/v1/object/public/brand-assets/';
    const previousPath = previousUrl.includes(marker) ? previousUrl.split(marker)[1] : null;
    if (previousPath) await supabase().storage.from('brand-assets').remove([previousPath]);
  }
  return publicUrl.publicUrl;
}

export async function deletePromoCardImage(imageUrl?: string | null) {
  if (!imageUrl) return;
  const marker = '/storage/v1/object/public/brand-assets/';
  const path = imageUrl.includes(marker) ? imageUrl.split(marker)[1] : null;
  if (path) await supabase().storage.from('brand-assets').remove([path]);
}
