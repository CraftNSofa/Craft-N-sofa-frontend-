import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  CircleDollarSign,
  ClipboardList,
  CloudUpload,
  Database,
  Download,
  Edit3,
  ImagePlus,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';
import type { Banner, Product, PromoCard, Tag as ProductTag } from './types';
import type { StoreContentBlock } from './lib/commerce';
import { INITIAL_SAMPLE_PRODUCTS } from './config/supabase';
import { clearStoreLogo, createExpense, deleteCategory, deleteProduct as deleteRemoteProduct, deleteStoreBanner, deleteTag, getCurrentUser, loadBanners, loadCategories, loadExpenses, loadOrders, loadProducts, loadStoreBranding, loadTags, saveStoreContent, uploadSecondaryStoreImage, clearSecondaryStoreImage, signInAdmin, signOutAdmin, subscribeToOrders, updateOrderStatus as updateRemoteOrderStatus, upsertCategory, upsertTag, saveProduct as saveRemoteProduct, uploadProductImage, uploadCategoryImage, uploadStoreBanner, uploadStoreLogo, savePromoCards as saveRemotePromoCards, uploadPromoCardImage, deletePromoCardImage, uploadStoreContentImage, deleteStoreContentImage } from './lib/commerce';
import { getSupabaseClient } from './config/supabase';

type Tab = 'overview' | 'products' | 'add-product' | 'add-category' | 'categories' | 'add-tag' | 'tags' | 'orders' | 'finance' | 'promotions' | 'settings';
type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
type Category = { id: string; name: string; description: string; active: boolean; image_url?: string | null; slug?: string; parent_id?: string | null };
type AdminTag = ProductTag;
type Order = { id: string; customer: string; location: string; items: number; total: number; cost: number; status: OrderStatus; date: string; payment: 'Paid' | 'Pending' };
type Expense = { id: string; title: string; category: string; amount: number; date: string };

type ProductForm = { id?: string; name: string; description: string; price: number; discount_price: number | null; original_price: number | null; category: string; category_id?: string | null; image_url: string; images: string[]; colors: string[]; tags: string[]; stock: number; featured: boolean; cost_price: number; published?: boolean; image_file?: File };
type PromoCardDraft = PromoCard & { image_file?: File };
type StoreContentData = { custom_html: string; custom_css: string; secondary_image_url: string | null; secondary_image_title: string; content_blocks: StoreContentBlock[] };

const money = (value: number) => `Rs ${Math.round(value).toLocaleString('en-IN')}`;
const today = new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

const starterCategories: Category[] = [
  { id: 'cat-1', name: 'Sofas', description: 'Signature seating for living spaces', active: true },
  { id: 'cat-2', name: 'Bedroom', description: 'Beds and bedroom furniture', active: true },
  { id: 'cat-3', name: 'Chairs', description: 'Accent and dining chairs', active: true },
  { id: 'cat-4', name: 'Tables', description: 'Coffee, side and dining tables', active: true },
];

const starterTags: AdminTag[] = [
  { id: 'tag-1', name: 'New Arrival', description: 'Recently added pieces', active: true },
  { id: 'tag-2', name: 'Featured', description: 'Highlighted on the storefront', active: true },
  { id: 'tag-3', name: 'Best Seller', description: 'Popular customer choice', active: true },
];

const starterOrders: Order[] = [
  { id: '#CNS-1048', customer: 'Aarav Mehta', location: 'Bengaluru', items: 2, total: 58900, cost: 32800, status: 'Processing', date: '2026-08-15', payment: 'Paid' },
  { id: '#CNS-1047', customer: 'Riya Sharma', location: 'Mumbai', items: 1, total: 24900, cost: 13800, status: 'Confirmed', date: '2026-08-15', payment: 'Paid' },
  { id: '#CNS-1046', customer: 'Kabir Khan', location: 'Delhi', items: 3, total: 76500, cost: 42700, status: 'Shipped', date: '2026-08-14', payment: 'Paid' },
  { id: '#CNS-1045', customer: 'Naina Kapoor', location: 'Pune', items: 1, total: 18500, cost: 10400, status: 'Delivered', date: '2026-08-13', payment: 'Paid' },
  { id: '#CNS-1044', customer: 'Dev Malhotra', location: 'Hyderabad', items: 2, total: 42000, cost: 23900, status: 'Pending', date: '2026-08-13', payment: 'Pending' },
];

const starterExpenses: Expense[] = [
  { id: 'exp-1', title: 'Studio rent', category: 'Rent', amount: 28000, date: '2026-08-01' },
  { id: 'exp-2', title: 'Packaging supplies', category: 'Operations', amount: 6200, date: '2026-08-05' },
  { id: 'exp-3', title: 'Social media campaign', category: 'Marketing', amount: 8400, date: '2026-08-09' },
  { id: 'exp-4', title: 'Local delivery fuel', category: 'Logistics', amount: 3900, date: '2026-08-12' },
];

function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? initial; } catch { return initial; }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue] as const;
}

function StatCard({ label, value, change, icon: Icon, tone = 'purple' }: { label: string; value: string; change?: string; icon: typeof TrendingUp; tone?: 'purple' | 'green' | 'amber' | 'blue' }) {
  const tones = { purple: 'bg-purple-50 text-purple-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700' };
  return <div className="stat-card"><div className={`icon-box ${tones[tone]}`}><Icon size={19} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong>{change && <small className="positive"><ArrowUpRight size={13} /> {change}</small>}</div></div>;
}

function StatusPill({ status }: { status: OrderStatus }) {
  const colors: Record<OrderStatus, string> = { Pending: 'status-pending', Confirmed: 'status-confirmed', Processing: 'status-processing', Shipped: 'status-shipped', Delivered: 'status-delivered', Cancelled: 'status-cancelled' };
  return <span className={`status-pill ${colors[status]}`}><span />{status}</span>;
}

function App() {
  const [session, setSession] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [storeContent, setStoreContent] = useState<StoreContentData>({ custom_html: '', custom_css: '', secondary_image_url: null, secondary_image_title: 'Craft N Sofa collection', content_blocks: [] });
  const [promoCards, setPromoCards] = useState<PromoCard[]>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [products, setProducts] = usePersisted<Product[]>('cns_products', INITIAL_SAMPLE_PRODUCTS);
  const [categories, setCategories] = usePersisted<Category[]>('cns_categories', starterCategories);
  const [tags, setTags] = usePersisted<AdminTag[]>('cns_tags', starterTags);
  const [orders, setOrders] = usePersisted<Order[]>('cns_orders', starterOrders);
  const [expenses, setExpenses] = usePersisted<Expense[]>('cns_expenses', starterExpenses);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    getCurrentUser().then(async user => {
      if (!active || !user) return;
      setSession(true);
      const results = await Promise.allSettled([loadProducts(), loadCategories(), loadTags(), loadOrders(), loadExpenses(), loadStoreBranding(), loadBanners()]);
      if (!active) return;
      const [productResult, categoryResult, tagResult, orderResult, expenseResult, brandingResult, bannerResult] = results;
      if (productResult.status === 'fulfilled') setProducts(productResult.value);
      if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value.map(category => ({ id: category.id, name: category.name, description: category.description || '', active: category.active, image_url: category.image_url || null, slug: category.slug, parent_id: category.parent_id || null })));
      if (tagResult.status === 'fulfilled') setTags(tagResult.value.map(tag => ({ id: tag.id, name: tag.name, description: tag.description || '', active: tag.active })));
      if (orderResult.status === 'fulfilled') setOrders(orderResult.value.map(order => ({ id: order.id, customer: order.customer_name, location: String(order.shipping_address?.city || 'Online'), items: order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0, total: Number(order.total), cost: order.order_items?.reduce((sum, item) => sum + Number(item.cost_price) * item.quantity, 0) || 0, status: ({ pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' } as Record<string, OrderStatus>)[order.status] || 'Pending', date: order.created_at.slice(0, 10), payment: order.payment_status === 'paid' ? 'Paid' : 'Pending' })));
      if (expenseResult.status === 'fulfilled') setExpenses(expenseResult.value.map(expense => ({ id: expense.id, title: expense.title, category: expense.category, amount: Number(expense.amount), date: expense.expense_date })));
      if (brandingResult.status === 'fulfilled') { setBrandLogoUrl(brandingResult.value.logo_url); setStoreContent({ custom_html: brandingResult.value.custom_html || '', custom_css: brandingResult.value.custom_css || '', secondary_image_url: brandingResult.value.secondary_image_url || null, secondary_image_title: brandingResult.value.secondary_image_title || 'Craft N Sofa collection', content_blocks: brandingResult.value.content_blocks || [] }); setPromoCards((brandingResult.value.promo_cards || []).sort((a, b) => a.sort_order - b.sort_order)); }
      if (bannerResult.status === 'fulfilled') setBanners(bannerResult.value);
      setRemoteReady(true);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!remoteReady) return;
    const channel = subscribeToOrders(() => { loadOrders().then(remoteOrders => setOrders(remoteOrders.map(order => ({ id: order.id, customer: order.customer_name, location: String(order.shipping_address?.city || 'Online'), items: order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0, total: Number(order.total), cost: order.order_items?.reduce((sum, item) => sum + Number(item.cost_price) * item.quantity, 0) || 0, status: ({ pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' } as Record<string, OrderStatus>)[order.status] || 'Pending', date: order.created_at.slice(0, 10), payment: order.payment_status === 'paid' ? 'Paid' : 'Pending' })))).catch(() => undefined); });
    return () => { getSupabaseClient().removeChannel(channel); };
  }, [remoteReady]);
  const [productModal, setProductModal] = useState<ProductForm | null>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [tagModal, setTagModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandingModal, setBrandingModal] = useState(false);
  const [bannerModal, setBannerModal] = useState(false);

  const showToast = (text: string) => { setToast(text); window.setTimeout(() => setToast(''), 2800); };
  const activeCategories = categories.filter(c => c.active);
  const revenue = orders.filter(o => o.payment === 'Paid' && o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);
  const productCost = orders.filter(o => o.payment === 'Paid' && o.status !== 'Cancelled').reduce((s, o) => s + o.cost, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = revenue - productCost;
  const netProfit = grossProfit - expenseTotal;
  const filteredProducts = products.filter(p => `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(query.toLowerCase()));
  const lowStock = products.filter(p => (p.stock || 0) < 5).length;

  const nav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Product List', icon: Package },
    { id: 'add-product', label: 'Add Product', icon: Plus },
    { id: 'add-category', label: 'Add Category', icon: Plus },
    { id: 'categories', label: 'Category List', icon: Tag },
    { id: 'add-tag', label: 'Add Tag', icon: Plus },
    { id: 'tags', label: 'Tag List', icon: Tag },
    { id: 'orders', label: 'Live Orders', icon: ShoppingBag, badge: orders.filter(o => ['Pending', 'Confirmed', 'Processing'].includes(o.status)).length },
    { id: 'finance', label: 'Finance & Reports', icon: CircleDollarSign },
    { id: 'promotions', label: 'Promo Cards', icon: ImagePlus },
    { id: 'settings', label: 'Store Settings', icon: Settings },
  ] as const;

  const openNewProduct = () => setProductModal({ name: '', description: '', price: 0, discount_price: null, original_price: null, category: activeCategories[0]?.name || '', category_id: activeCategories[0]?.id || null, image_url: '', images: [], colors: [], tags: [], stock: 0, featured: false, cost_price: 0, published: true });
  const saveProduct = async (data: ProductForm) => {
    try {
      let imageUrl = data.image_url;
      if (data.image_file && remoteReady) imageUrl = await uploadProductImage(data.image_file);
      const selectedCategory = activeCategories.find(category => category.name === data.category);
      const item = { ...data, category_id: data.category_id || selectedCategory?.id || null, image_url: imageUrl, images: imageUrl ? [imageUrl, ...(data.images || []).filter(image => !image.startsWith('blob:'))] : data.images, tags: data.tags || [], id: data.id || undefined, created_at: data.id ? undefined : new Date().toISOString(), updated_at: new Date().toISOString() } as Product;
      const saved = remoteReady ? await saveRemoteProduct(item) : item;
      setProducts(prev => data.id ? prev.map(p => p.id === data.id ? saved : p) : [saved, ...prev]); setProductModal(null); showToast(data.id ? 'Product updated' : 'Product added to catalogue');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Could not save product'); }
  };
  const deleteProduct = async (id?: string | number) => { if (id !== undefined && window.confirm('Remove this product from the catalogue?')) { try { if (remoteReady) await deleteRemoteProduct(id); setProducts(prev => prev.filter(p => p.id !== id)); showToast('Product removed'); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not remove product'); } } };
  const saveCategories = async (next: Category[]) => { const previousIds = new Set(categories.map(category => category.id)); const nextIds = new Set(next.map(category => category.id)); const added = next.filter(category => !previousIds.has(category.id)); const removed = categories.filter(category => !nextIds.has(category.id)); try { if (!remoteReady) { setCategories(next); return; } const savedAdded = await Promise.all(added.map(category => upsertCategory({ name: category.name, description: category.description, active: category.active, image_url: category.image_url || null, parent_id: category.parent_id || null }))); await Promise.all(removed.map(category => deleteCategory(category.id))); setCategories([...next.filter(category => previousIds.has(category.id)), ...savedAdded.map(category => ({ id: category.id, name: category.name, description: category.description || '', active: category.active, image_url: category.image_url || null, slug: category.slug, parent_id: category.parent_id || null }))]); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not update categories'); } };
  const saveTags = async (next: AdminTag[]) => { const previousIds = new Set(tags.map(tag => tag.id)); const nextIds = new Set(next.map(tag => tag.id)); const added = next.filter(tag => !previousIds.has(tag.id)); const removed = tags.filter(tag => !nextIds.has(tag.id)); try { if (!remoteReady) { setTags(next); return; } const savedAdded = await Promise.all(added.map(tag => upsertTag({ name: tag.name, description: tag.description, active: tag.active }))); await Promise.all(removed.map(tag => deleteTag(tag.id))); setTags([...next.filter(tag => previousIds.has(tag.id)), ...savedAdded.map(tag => ({ id: tag.id, name: tag.name, description: tag.description || '', active: tag.active }))]); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not update tags'); } };
  const updateOrder = async (id: string, status: OrderStatus) => { try { const previous = orders.find(order => order.id === id)?.status; if (remoteReady) await updateRemoteOrderStatus(id, status.toLowerCase(), previous?.toLowerCase()); setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o)); setSelectedOrder(prev => prev ? { ...prev, status } : prev); showToast(`Order ${id} marked ${status.toLowerCase()}`); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not update order'); } };
  const savePromoCards = async (next: PromoCard[]) => { try { if (!remoteReady) { setPromoCards(next); showToast('Promotional cards saved locally'); return; } const saved = await saveRemotePromoCards(next); const nextIds = new Set(next.map(card => card.id)); await Promise.all(promoCards.filter(card => !nextIds.has(card.id)).map(card => deletePromoCardImage(card.image_url))); setPromoCards((saved.promo_cards || next).sort((a, b) => a.sort_order - b.sort_order)); showToast('Promotional cards saved'); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not save promotional cards'); } };
  const uploadPromoImage = async (file: File, previousUrl?: string | null) => { if (!remoteReady) return URL.createObjectURL(file); return uploadPromoCardImage(file, previousUrl); };
  const handleSaveStoreContent = async (next: StoreContentData) => {
    if (!remoteReady) { setStoreContent(next); showToast('Store content saved locally'); return; }
    const nextIds = new Set(next.content_blocks.map(block => block.id));
    await Promise.all(storeContent.content_blocks.filter(block => !nextIds.has(block.id)).map(block => deleteStoreContentImage(block.image_url)));
    const saved = await saveStoreContent(next);
    setStoreContent({ custom_html: saved.custom_html, custom_css: saved.custom_css, secondary_image_url: saved.secondary_image_url, secondary_image_title: saved.secondary_image_title, content_blocks: saved.content_blocks });
    showToast('Store content saved');
  };
  const handleUploadSecondary = async (file: File, title: string) => {
    if (!remoteReady) { setStoreContent(current => ({ ...current, secondary_image_url: URL.createObjectURL(file), secondary_image_title: title })); return; }
    const saved = await uploadSecondaryStoreImage(file, storeContent.secondary_image_url, title);
    setStoreContent({ custom_html: saved.custom_html, custom_css: saved.custom_css, secondary_image_url: saved.secondary_image_url, secondary_image_title: saved.secondary_image_title, content_blocks: saved.content_blocks });
    showToast('Secondary image replaced');
  };
  const handleClearSecondary = async () => {
    if (!remoteReady) { setStoreContent(current => ({ ...current, secondary_image_url: null })); return; }
    const saved = await clearSecondaryStoreImage(storeContent.secondary_image_url);
    setStoreContent({ custom_html: saved.custom_html, custom_css: saved.custom_css, secondary_image_url: saved.secondary_image_url, secondary_image_title: saved.secondary_image_title, content_blocks: saved.content_blocks });
    showToast('Secondary image removed');
  };
  const logout = async () => { await signOutAdmin(); setSession(false); setRemoteReady(false); };

  if (!session) return <LoginScreen onLogin={() => setSession(true)} />;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <div className="brand">{brandLogoUrl ? <img className="admin-brand-logo" src={brandLogoUrl} alt="Craft N Sofa" /> : <div className="brand-mark">C<span>•</span>S</div>}<div><b>Craft N Sofa</b><small>Admin workspace</small></div><button className="close-nav" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(item => <button key={item.id} className={tab === item.id ? 'nav-item active' : 'nav-item'} onClick={() => { setTab(item.id); setMobileNav(false); if (item.id === 'add-product') openNewProduct(); if (item.id === 'add-category') setCategoryModal(true); if (item.id === 'add-tag') setTagModal(true); }}><item.icon size={18} /><span>{item.label}</span>{'badge' in item && item.badge ? <em>{item.badge}</em> : null}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Bell size={17} /></div><b>Stay on top of orders</b><p>Turn on notifications when connecting your live store.</p></div><button className="nav-item logout" onClick={logout}><span className="avatar">AM</span><span className="user-name">Admin Manager</span><ChevronDown size={15} /></button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="menu-button" onClick={() => setMobileNav(true)}><Menu size={21} /></button><div><div className="eyebrow">SATURDAY, AUGUST 15, 2026</div><h1>{nav.find(n => n.id === tab)?.label}</h1></div><div className="top-actions"><div className="store-status"><span /> Store is live <small>●</small></div><button className="icon-button"><Bell size={18} /></button><div className="top-avatar">AM</div></div></header>
      {toast && <div className="toast"><Check size={16} /> {toast}</div>}
      <div className="page-body">
        {tab === 'overview' && <Overview revenue={revenue} grossProfit={grossProfit} netProfit={netProfit} orders={orders} lowStock={lowStock} expenseTotal={expenseTotal} onOrders={() => setTab('orders')} onProducts={() => setTab('products')} />}
        {(tab === 'products' || tab === 'add-product') && <ProductsView products={filteredProducts} categories={categories} query={query} onQuery={setQuery} onNew={openNewProduct} onEdit={p => setProductModal({ ...p, id: String(p.id) } as ProductForm)} onDelete={deleteProduct} onCategories={() => setCategoryModal(true)} />}
        {tab === 'categories' && <CategoryListView categories={categories} onAdd={() => setCategoryModal(true)} onDelete={id => saveCategories(categories.filter(category => category.id !== id))} />}
        {tab === 'tags' && <TagListView tags={tags} onAdd={() => setTagModal(true)} onDelete={id => saveTags(tags.filter(tag => tag.id !== id))} />}
        {tab === 'orders' && <OrdersView orders={orders} onStatus={updateOrder} onSelect={setSelectedOrder} query={query} onQuery={setQuery} />}
        {tab === 'finance' && <FinanceView revenue={revenue} productCost={productCost} grossProfit={grossProfit} netProfit={netProfit} expenses={expenses} onExpense={() => setExpenseModal(true)} />}
        {tab === 'promotions' && <PromoCardsView cards={promoCards} categories={activeCategories} onSave={savePromoCards} onUploadImage={uploadPromoImage} />}
        {tab === 'settings' && <StoreSettingsView logoUrl={brandLogoUrl} banners={banners} content={storeContent} onSaveContent={handleSaveStoreContent} onUploadSecondary={async (file, title) => { try { if (!remoteReady) throw new Error('Connect the admin workspace before uploading storefront images'); await handleUploadSecondary(file, title); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not upload secondary image'); } }} onClearSecondary={async () => { try { if (!remoteReady) throw new Error('Connect the admin workspace before changing storefront images'); await handleClearSecondary(); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not remove secondary image'); }}} onUploadBlockImage={async (file, previousUrl) => { try { if (!remoteReady) return URL.createObjectURL(file); return await uploadStoreContentImage(file, previousUrl); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not upload block image'); throw error; } }} onChangeLogo={() => setBrandingModal(true)} onAddBanner={() => setBannerModal(true)} onDeleteBanner={async banner => { try { if (!remoteReady) throw new Error('Connect the admin workspace before changing banners'); await deleteStoreBanner(banner.id, banner.image_url); setBanners(current => current.filter(item => item.id !== banner.id)); showToast('Banner removed'); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not remove banner'); } }} onRemove={async () => { try { if (!remoteReady) throw new Error('Connect the admin workspace before changing branding'); await clearStoreLogo(brandLogoUrl); setBrandLogoUrl(null); showToast('Store logo removed'); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not remove logo'); } }} />}
      </div>
    </main>
    {productModal && <ProductModal initial={productModal} categories={activeCategories} tags={tags} onClose={() => setProductModal(null)} onSave={saveProduct} />}
    {categoryModal && <CategoryModal categories={categories} onClose={() => setCategoryModal(false)} onSave={saveCategories} onUploadImage={async file => { if (!remoteReady) return URL.createObjectURL(file); return uploadCategoryImage(file); }} />}
    {tagModal && <TagModal tags={tags} onClose={() => setTagModal(false)} onSave={saveTags} />}
    {expenseModal && <ExpenseModal onClose={() => setExpenseModal(false)} onSave={async e => { try { const saved = remoteReady ? await createExpense({ title: e.title, category: e.category, amount: e.amount, expense_date: e.date }) : { ...e, id: uid() }; setExpenses(prev => [({ id: saved.id, title: saved.title, category: saved.category, amount: Number(saved.amount), date: 'expense_date' in saved ? saved.expense_date : saved.date } as Expense), ...prev]); setExpenseModal(false); showToast('Expense recorded in ledger'); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not record expense'); } }} />}
    {selectedOrder && <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatus={updateOrder} />}
    {bannerModal && <BannerUploadModal onClose={() => setBannerModal(false)} onSave={async (file, altText) => { try { if (!remoteReady) throw new Error('Connect the admin workspace before adding banners'); const saved = await uploadStoreBanner(file, altText); setBanners(current => [...current, saved]); setBannerModal(false); showToast('Banner added to rotation'); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not add banner'); } }} />}
    {brandingModal && <BrandingModal logoUrl={brandLogoUrl} onClose={() => setBrandingModal(false)} onSave={async file => { try { if (!remoteReady) throw new Error('Connect the admin workspace before changing branding'); const saved = await uploadStoreLogo(file, brandLogoUrl); setBrandLogoUrl(saved.logo_url); setBrandingModal(false); showToast('Store logo updated'); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not update logo'); } }} onRemove={async () => { try { if (!remoteReady) throw new Error('Connect the admin workspace before changing branding'); await clearStoreLogo(brandLogoUrl); setBrandLogoUrl(null); setBrandingModal(false); showToast('Store logo removed'); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not remove logo'); } }} />}
  </div>;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => { loadStoreBranding().then(branding => setLogoUrl(branding.logo_url)).catch(() => undefined); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    const { error: authError } = await signInAdmin(email, password);
    setBusy(false);
    if (authError) { setError(authError.message); return; }
    onLogin();
  };
  return <div className="login-page"><div className="login-card"><div className="login-logo-wrap">{logoUrl ? <img src={logoUrl} alt="Craft N Sofa" className="login-logo" /> : <div className="brand-mark large">C<span>•</span>S</div>}</div><div className="eyebrow">CRAFT N SOFA</div><h1>Welcome to your<br /><i>store workspace.</i></h1><p>Sign in with your authorised admin account to manage the store.</p><form onSubmit={submit} className="login-form"><label>Admin email<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" placeholder="you@example.com" /></label><label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} required autoComplete="current-password" placeholder="Your password" /></label>{error && <small className="form-error"><AlertCircle size={13} /> {error}</small>}<button className="primary-button full" disabled={busy}>{busy ? 'Signing in…' : 'Enter admin workspace'} <ArrowUpRight size={17} /></button></form><small className="demo-note"><Database size={13} /> Secure access is managed by Supabase Auth.</small></div></div>;
}

function Overview({ revenue, grossProfit, netProfit, orders, lowStock, expenseTotal, onOrders, onProducts }: { revenue: number; grossProfit: number; netProfit: number; orders: Order[]; lowStock: number; expenseTotal: number; onOrders: () => void; onProducts: () => void }) {
  const max = Math.max(...[42, 56, 48, 72, 65, 82, 76], 1);
  return <><section className="welcome-row"><div><h2>Good morning, Admin.</h2><p>Here’s what’s happening with your store today.</p></div><div className="date-filter">Last 30 days <ChevronDown size={15} /></div></section><section className="stats-grid"><StatCard label="Total revenue" value={money(revenue)} change="12.8%" icon={TrendingUp} tone="purple" /><StatCard label="Gross profit" value={money(grossProfit)} change="8.4%" icon={WalletCards} tone="green" /><StatCard label="Orders" value={String(orders.length + 124)} change="6.2%" icon={ShoppingBag} tone="blue" /><StatCard label="Operating expenses" value={money(expenseTotal)} icon={ClipboardList} tone="amber" /></section><section className="dashboard-grid"><div className="panel chart-panel"><div className="panel-heading"><div><h3>Sales velocity</h3><p>Revenue across the last 7 days</p></div><span className="legend"><i /> Revenue</span></div><div className="chart-wrap"><div className="y-axis"><span>Rs 1.0L</span><span>Rs 75k</span><span>Rs 50k</span><span>Rs 25k</span><span>Rs 0</span></div><div className="bars">{[42, 56, 48, 72, 65, 82, 76].map((v, i) => <div className="bar-col" key={i}><div className="bar" style={{ height: `${(v / max) * 100}%` }}><b>{i === 5 ? 'Rs 82k' : ''}</b></div><small>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</small></div>)}</div></div></div><div className="panel attention-panel"><div className="panel-heading"><div><h3>Needs attention</h3><p>Quick actions for today</p></div><AlertCircle size={18} className="muted" /></div><button className="attention-item" onClick={onOrders}><span className="attention-number red">{orders.filter(o => o.status === 'Pending').length}</span><span><b>Orders awaiting confirmation</b><small>Review and confirm new orders</small></span><ArrowUpRight size={16} /></button><button className="attention-item" onClick={onProducts}><span className="attention-number amber">{lowStock}</span><span><b>Products low in stock</b><small>Restock before you run out</small></span><ArrowUpRight size={16} /></button><div className="profit-mini"><span>Net profit this month</span><b>{money(netProfit)}</b><small><ArrowUpRight size={13} /> 14.6% vs last month</small></div></div></section><section className="panel recent-panel"><div className="panel-heading"><div><h3>Recent orders</h3><p>Latest activity from your storefront</p></div><button className="text-button" onClick={onOrders}>View all orders <ArrowUpRight size={15} /></button></div><OrderTable orders={orders.slice(0, 4)} compact /></section></>;
}

function ProductsView({ products, categories, query, onQuery, onNew, onEdit, onDelete, onCategories }: { products: Product[]; categories: Category[]; query: string; onQuery: (s: string) => void; onNew: () => void; onEdit: (p: Product) => void; onDelete: (id?: string | number) => void; onCategories: () => void }) { return <><section className="welcome-row"><div><h2>Catalogue management</h2><p>Add products, manage stock and keep your categories tidy.</p></div><div className="button-row"><button className="secondary-button" onClick={onCategories}><Tag size={16} /> Manage categories</button><button className="primary-button" onClick={onNew}><Plus size={17} /> Add product</button></div></section><div className="toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={e => onQuery(e.target.value)} placeholder="Search products..." /></div><span className="result-count">{products.length} products</span></div><section className="product-grid">{products.map(p => <div className="product-tile" key={String(p.id)}><div className="product-image">{p.image_url ? <img src={p.image_url} alt={p.name} /> : <div className="image-placeholder"><ImagePlus size={25} /></div>}{p.tags?.length ? <div className="product-tag-badges">{p.tags.slice(0, 3).map(tag => <span className="stock-badge" key={tag}>{tag}</span>)}</div> : null}<div className="tile-actions"><button type="button" onClick={() => onEdit(p)} aria-label={`Edit ${p.name}`} title="Edit product"><Edit3 size={15} /><span>Edit</span></button><button type="button" onClick={() => onDelete(p.id)} aria-label={`Delete ${p.name}`} title="Delete product"><Trash2 size={15} /></button></div></div><div className="product-info"><div className="product-category">{p.category}</div><h3>{p.name}</h3><div className="product-bottom"><b>{money(p.discount_price || p.price)}</b><span>{p.stock || 0} units</span></div></div></div>)}{!products.length && <div className="empty-state"><Package size={30} /><h3>No products found</h3><p>Try a different search or add your first product.</p></div>}</section><div className="storage-note"><CloudUpload size={18} /><span><b>Image storage ready</b><small>Drag files into the product form. Images upload to the connected Supabase Storage bucket and appear on the storefront.</small></span></div></> }

function OrdersView({ orders, onStatus, onSelect, query, onQuery }: { orders: Order[]; onStatus: (id: string, s: OrderStatus) => void; onSelect: (o: Order) => void; query: string; onQuery: (s: string) => void }) { const shown = orders.filter(o => `${o.id} ${o.customer} ${o.location} ${o.status}`.toLowerCase().includes(query.toLowerCase())); return <><section className="welcome-row"><div><h2>Live order desk</h2><p>Track incoming orders and keep customers moving.</p></div><div className="live-indicator"><span /> Live updates enabled</div></section><div className="toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={e => onQuery(e.target.value)} placeholder="Search order, customer or city..." /></div><button className="secondary-button"><Download size={16} /> Export report</button></div><section className="panel order-panel"><OrderTable orders={shown} onStatus={onStatus} onSelect={onSelect} /></section></> }

function OrderTable({ orders, compact = false, onStatus, onSelect }: { orders: Order[]; compact?: boolean; onStatus?: (id: string, s: OrderStatus) => void; onSelect?: (o: Order) => void }) { return <div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th>{!compact && <th />}</tr></thead><tbody>{orders.map(o => <tr key={o.id} onClick={() => onSelect?.(o)}><td><b className="order-id">{o.id}</b></td><td><b>{o.customer}</b><small>{o.location}</small></td><td>{o.items}</td><td><b>{money(o.total)}</b><small className="paid">{o.payment}</small></td><td>{onStatus ? <select className="status-select" value={o.status} onClick={e => e.stopPropagation()} onChange={e => onStatus(o.id, e.target.value as OrderStatus)}>{(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map(s => <option key={s}>{s}</option>)}</select> : <StatusPill status={o.status} />}</td><td>{o.date}</td>{!compact && <td><button className="row-arrow" onClick={e => { e.stopPropagation(); onSelect?.(o); }}><ArrowUpRight size={16} /></button></td>}</tr>)}</tbody></table></div> }

function FinanceView({ revenue, productCost, grossProfit, netProfit, expenses, onExpense }: { revenue: number; productCost: number; grossProfit: number; netProfit: number; expenses: Expense[]; onExpense: () => void }) { const margin = revenue ? Math.round((grossProfit / revenue) * 100) : 0; const expenseGroups = expenses.reduce<Record<string, number>>((a, e) => { a[e.category] = (a[e.category] || 0) + e.amount; return a; }, {}); return <><section className="welcome-row"><div><h2>Finance & reports</h2><p>Understand where your money is coming from and going.</p></div><div className="button-row"><button className="secondary-button"><Download size={16} /> Export CSV</button><button className="primary-button" onClick={onExpense}><Plus size={17} /> Record expense</button></div></section><section className="finance-grid"><StatCard label="Captured revenue" value={money(revenue)} change="12.8%" icon={ArrowUpRight} tone="purple" /><StatCard label="Product cost" value={money(productCost)} icon={ArrowDownRight} tone="amber" /><StatCard label="Gross margin" value={`${margin}%`} change="3.1%" icon={BarChart3} tone="green" /><StatCard label="Net profit" value={money(netProfit)} change="14.6%" icon={CircleDollarSign} tone="blue" /></section><section className="dashboard-grid"><div className="panel ledger-panel"><div className="panel-heading"><div><h3>Financial ledger</h3><p>Revenue and cost snapshots from paid orders</p></div><span className="ledger-date">August 2026</span></div><div className="ledger-lines"><div><span className="ledger-dot green" /><span>Sales revenue</span><b>{money(revenue)}</b></div><div><span className="ledger-dot amber" /><span>Product cost of goods</span><b className="negative">− {money(productCost)}</b></div><div><span className="ledger-dot purple" /><span>Gross profit</span><b>{money(grossProfit)}</b></div><div><span className="ledger-dot red" /><span>Operating expenses</span><b className="negative">− {money(expenses.reduce((s, e) => s + e.amount, 0))}</b></div><div className="ledger-total"><span>Net operating profit</span><b>{money(netProfit)}</b></div></div></div><div className="panel expense-panel"><div className="panel-heading"><div><h3>Expense breakdown</h3><p>Operating costs by category</p></div><ClipboardList size={18} className="muted" /></div><div className="expense-bars">{Object.entries(expenseGroups).map(([name, amount], i) => <div className="expense-bar-row" key={name}><div><span>{name}</span><b>{money(amount)}</b></div><div className="track"><i style={{ width: `${Math.max(12, amount / Math.max(...Object.values(expenseGroups)) * 100)}%`, background: ['#7c3aed', '#f59e0b', '#10b981', '#3b82f6'][i % 4] }} /></div></div>)}</div></div></section><section className="panel recent-panel"><div className="panel-heading"><div><h3>Expense tracker</h3><p>Every operational expense in one place</p></div><button className="text-button" onClick={onExpense}>Add expense <Plus size={15} /></button></div><div className="expense-list">{expenses.map(e => <div className="expense-row" key={e.id}><div className="expense-icon"><ClipboardList size={16} /></div><div><b>{e.title}</b><small>{e.category} · {e.date}</small></div><strong>{money(e.amount)}</strong></div>)}</div></section></> }

function PromoCardsView({ cards, categories, onSave, onUploadImage }: { cards: PromoCard[]; categories: Category[]; onSave: (cards: PromoCard[]) => Promise<void>; onUploadImage: (file: File, previousUrl?: string | null) => Promise<string> }) {
  const [drafts, setDrafts] = useState<PromoCardDraft[]>(cards.map(card => ({ ...card })));
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDrafts(cards.map(card => ({ ...card }))); }, [cards]);
  const update = (id: string, patch: Partial<PromoCardDraft>) => setDrafts(current => current.map(card => card.id === id ? { ...card, ...patch } : card));
  const chooseImage = (id: string, file?: File) => {
    if (!file || !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return;
    setDrafts(current => current.map(card => card.id === id ? { ...card, image_file: file, previous_image_url: card.image_url, image_url: URL.createObjectURL(file) } as PromoCardDraft & { previous_image_url?: string | null } : card));
  };
  const addCard = () => { if (drafts.length >= 3) return; setDrafts(current => [...current, { id: `promo-${uid()}`, image_url: '', eyebrow: 'COLLECTION', title: '', link_category: categories[0]?.name || 'All pieces', active: true, sort_order: current.length }]); };
  const removeCard = (id: string) => setDrafts(current => current.filter(card => card.id !== id));
  const moveCard = (index: number, direction: -1 | 1) => setDrafts(current => { const nextIndex = index + direction; if (nextIndex < 0 || nextIndex >= current.length) return current; const next = [...current]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; return next; });
  const save = async () => {
    if (!drafts.length) { await onSave([]); return; }
    if (drafts.some(card => !card.image_url || !card.title.trim() || !card.link_category)) { window.alert('Each promotional card needs an image, a bold heading, and a collection link.'); return; }
    setBusy(true);
    try {
      const uploaded = await Promise.all(drafts.map(async card => {
        const draft = card as PromoCardDraft & { previous_image_url?: string | null };
        const imageUrl = draft.image_file ? await onUploadImage(draft.image_file, draft.previous_image_url || null) : draft.image_url;
        const { image_file: _imageFile, previous_image_url: _previousImageUrl, ...clean } = draft;
        return { ...clean, image_url: imageUrl };
      }));
      await onSave(uploaded.map((card, index) => ({ ...card, sort_order: index })));
    } finally { setBusy(false); }
  };
  return <><section className="welcome-row"><div><h2>Promotional Cards</h2><p>Build the three collection cards that appear below your product grid.</p></div><button className="primary-button" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></section><section className="panel promo-cards-manager"><div className="panel-heading"><div><span className="eyebrow">HOME PAGE PROMOTION</span><h3>Three-card collection showcase</h3><p>Upload a visual, add a bold heading, and choose where each card takes shoppers.</p></div><button className="secondary-button" onClick={addCard} disabled={drafts.length >= 3}><Plus size={15} /> {drafts.length >= 3 ? '3 cards added' : 'Add card'}</button></div><div className="promo-admin-grid">{drafts.map((card, index) => <article className="promo-admin-card" key={card.id}><div className="promo-admin-image">{card.image_url ? <img src={card.image_url} alt="Promotional card preview" /> : <div className="promo-image-empty"><ImagePlus size={24} /><span>Upload card image</span><small>Recommended: landscape image</small></div>}<label className="promo-image-upload"><Upload size={14} /> {card.image_url ? 'Replace image' : 'Choose image'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => chooseImage(card.id, event.target.files?.[0])} /></label></div><div className="promo-admin-fields"><label>Small label<input value={card.eyebrow} onChange={event => update(card.id, { eyebrow: event.target.value })} placeholder="COLLECTION" /></label><label>Bold heading<input value={card.title} onChange={event => update(card.id, { title: event.target.value })} placeholder="Made for slow mornings" /></label><label>Link to collection<select value={card.link_category} onChange={event => update(card.id, { link_category: event.target.value })}><option value="All pieces">All pieces</option>{categories.map(category => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label><label className="promo-active-toggle"><input type="checkbox" checked={card.active} onChange={event => update(card.id, { active: event.target.checked })} /><span>Show this card on the storefront</span></label></div><div className="promo-admin-footer"><span>Card {String(index + 1).padStart(2, '0')}</span><div><button className="icon-button" title="Move card left" onClick={() => moveCard(index, -1)} disabled={index === 0}><ArrowUpRight size={14} style={{ transform: 'rotate(-90deg)' }} /></button><button className="icon-button" title="Move card right" onClick={() => moveCard(index, 1)} disabled={index === drafts.length - 1}><ArrowUpRight size={14} style={{ transform: 'rotate(90deg)' }} /></button><button className="icon-button danger" title="Remove card" onClick={() => removeCard(card.id)}><Trash2 size={14} /></button></div></div></article>)}</div>{!drafts.length && <div className="promo-empty-state"><ImagePlus size={21} /><div><b>No promotional cards yet.</b><small>Add up to three cards to introduce key collections below the product grid.</small></div><button className="secondary-button" onClick={addCard}>Add first card</button></div>}<div className="promo-manager-note"><Check size={15} /><span>Cards are displayed in this order. Only cards marked visible appear on the public store.</span></div></section></>;
}
function StoreSettingsView({ logoUrl, banners, content, onChangeLogo, onAddBanner, onDeleteBanner, onRemove, onSaveContent, onUploadSecondary, onClearSecondary, onUploadBlockImage }: { logoUrl: string | null; banners: Banner[]; content: StoreContentData; onChangeLogo: () => void; onAddBanner: () => void; onDeleteBanner: (banner: Banner) => Promise<void>; onRemove: () => Promise<void>; onSaveContent: (content: StoreContentData) => Promise<void>; onUploadSecondary: (file: File, title: string) => Promise<void>; onClearSecondary: () => Promise<void>; onUploadBlockImage: (file: File, previousUrl?: string | null) => Promise<string> }) {
  return <><section className="welcome-row"><div><h2>Store Settings</h2><p>Manage the identity customers see on your Craft N Sofa website.</p></div></section><section className="settings-grid"><div className="panel settings-card"><div className="panel-heading"><div><span className="eyebrow">BRAND IDENTITY</span><h3>Website logo</h3><p>This logo appears in the public website header and footer.</p></div><Settings size={18} className="muted" /></div><div className="settings-logo-preview">{logoUrl ? <img src={logoUrl} alt="Current store logo" /> : <div className="branding-placeholder">C<span>•</span>S</div>}</div><div className="settings-card-actions"><button className="primary-button" onClick={onChangeLogo}><Upload size={16} /> {logoUrl ? 'Replace logo' : 'Add website logo'}</button>{logoUrl && <button className="danger-button" onClick={onRemove}>Remove logo</button>}</div><small className="settings-help">Recommended: a transparent PNG or SVG. Maximum size 5 MB.</small></div><div className="panel settings-card settings-info"><span className="eyebrow">LIVE PREVIEW</span><h3>Where it appears</h3><div className="settings-location"><span>01</span><div><b>Public header</b><small>Top navigation of your storefront</small></div></div><div className="settings-location"><span>02</span><div><b>Public footer</b><small>Brand signature at the bottom of the website</small></div></div><a href="/" target="_blank" rel="noreferrer" className="secondary-button">Open public store <ArrowUpRight size={15} /></a></div></section><BannerManager banners={banners} onAdd={onAddBanner} onDelete={onDeleteBanner} /><StoreContentManager content={content} onSaveContent={onSaveContent} onUploadSecondary={onUploadSecondary} onClearSecondary={onClearSecondary} onUploadBlockImage={onUploadBlockImage} /></>;
}
function BannerManager({ banners, onAdd, onDelete }: { banners: Banner[]; onAdd: () => void; onDelete: (banner: Banner) => Promise<void> }) {
  return <section className="panel banner-manager"><div className="panel-heading"><div><span className="eyebrow">STOREFRONT HERO</span><h3>Rotating banners</h3><p>Upload multiple 1500 × 500 style banners. All uploaded banners rotate automatically on the public store.</p></div><button className="primary-button" onClick={onAdd}><ImagePlus size={16} /> Add banner</button></div><div className="banner-admin-grid">{banners.map(banner => <article className="banner-admin-card" key={banner.id}><img src={banner.image_url} alt={banner.alt_text} /><div className="banner-admin-meta"><b>{banner.alt_text}</b><button className="icon-button danger" onClick={() => onDelete(banner)} title="Remove banner"><Trash2 size={15} /></button></div></article>)}{!banners.length && <div className="empty-state">No banners yet. Add your first storefront banner.</div>}</div><small className="settings-help">Recommended format: 1500 × 500 px. Use JPG, PNG or WebP up to 10 MB.</small></section>;
}
function StoreContentManager({ content, onSaveContent, onUploadSecondary, onClearSecondary, onUploadBlockImage }: { content: StoreContentData; onSaveContent: (content: StoreContentData) => Promise<void>; onUploadSecondary: (file: File, title: string) => Promise<void>; onClearSecondary: () => Promise<void>; onUploadBlockImage: (file: File, previousUrl?: string | null) => Promise<string> }) {
  const [blocks, setBlocks] = useState<StoreContentBlock[]>(content.content_blocks || []);
  const [selectedId, setSelectedId] = useState<string | null>(content.content_blocks?.[0]?.id || null);
  const [secondaryTitle, setSecondaryTitle] = useState(content.secondary_image_title || 'Craft N Sofa collection');
  const [busy, setBusy] = useState(false);
  const selected = blocks.find(block => block.id === selectedId) || null;
  useEffect(() => {
    const nextBlocks = content.content_blocks || [];
    setBlocks(nextBlocks);
    setSelectedId(current => current && nextBlocks.some(block => block.id === current) ? current : nextBlocks[0]?.id || null);
    setSecondaryTitle(content.secondary_image_title || 'Craft N Sofa collection');
  }, [content.content_blocks, content.secondary_image_title]);
  const updateBlock = (changes: Partial<StoreContentBlock>) => { if (!selectedId) return; setBlocks(current => current.map(block => block.id === selectedId ? { ...block, ...changes } : block)); };
  const addBlock = () => { const block: StoreContentBlock = { id: `block-${uid()}`, title: 'Shop By Category', html: `<section class="category-block" aria-label="Shop by category">
  <span class="category-block-kicker">SHOP BY CATEGORY</span>
  <h2>Find your next piece.</h2>
  <div class="category-block-grid">
    <article class="category-block-card"><img src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=85" alt="Sofas" /><span>Living Room</span></article>
    <article class="category-block-card"><img src="https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&w=600&q=85" alt="Seating" /><span>Seating</span></article>
    <article class="category-block-card"><img src="https://images.unsplash.com/photo-1550226891-ef816aed4a98?auto=format&fit=crop&w=600&q=85" alt="Bedroom" /><span>Bedroom</span></article>
  </div>
</section>`, css: `.category-block { background: #f5f4f1; padding: 48px 20px; text-align: center; }
.category-block-kicker { color: #777; display: block; font-size: 10px; letter-spacing: .22em; margin-bottom: 14px; }
.category-block h2 { color: #141414; font-family: Georgia, serif; font-size: clamp(30px, 4vw, 48px); font-weight: 500; margin: 0 0 26px; }
.category-block-grid { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: auto; max-width: 936px; }
.category-block-card { background: #ddd9d1; border-radius: 12px; color: #fff; display: block; min-width: 0; overflow: hidden; position: relative; text-align: left; }
.category-block-card img { display: block; height: 300px; max-width: 100%; object-fit: cover; width: 300px; }
.category-block-card span { background: linear-gradient(180deg, transparent, #111c); bottom: 0; color: #fff; font-size: 16px; font-weight: 700; left: 0; padding: 50px 18px 18px; position: absolute; right: 0; }
@media (max-width: 720px) { .category-block-grid { grid-template-columns: 1fr; max-width: 300px; } .category-block-card img { height: auto; width: 100%; } }`, image_url: null, image_title: '', active: true, sort_order: blocks.length }; setBlocks(current => [...current, block]); setSelectedId(block.id); };
  const removeBlock = () => { if (!selectedId) return; const index = blocks.findIndex(block => block.id === selectedId); const next = blocks.filter(block => block.id !== selectedId); setBlocks(next); setSelectedId(next[Math.max(0, index - 1)]?.id || null); };
  const save = async () => { setBusy(true); try { await onSaveContent({ ...content, secondary_image_title: secondaryTitle, content_blocks: blocks.map((block, index) => ({ ...block, sort_order: index })) }); } finally { setBusy(false); } };
  const uploadBlockImage = async (file?: File) => { if (!file || !selected || !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return; setBusy(true); try { const imageUrl = await onUploadBlockImage(file, selected.image_url); updateBlock({ image_url: imageUrl }); } finally { setBusy(false); } };
  const uploadSecondary = async (file?: File) => { if (!file || !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return; setBusy(true); try { await onUploadSecondary(file, secondaryTitle); } finally { setBusy(false); } };
  const blockPreview = selected ? `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif}${selected.css}</style></head><body>${selected.html}${selected.image_url ? `<figure class="content-block-image"><img src="${selected.image_url}" alt="${selected.image_title || selected.title}" title="${selected.image_title || selected.title}"><figcaption>${selected.image_title || ''}</figcaption></figure>` : ''}</body></html>` : '<!doctype html><html><body><p style="font-family:Arial;padding:32px;color:#777">Choose a block to preview.</p></body></html>';
  return <section className="panel store-content-manager"><div className="panel-heading"><div><span className="eyebrow">STOREFRONT CONTENT</span><h3>Block manager</h3><p>Save reusable HTML/CSS blocks, upload an image for each block, and check the result in the live preview.</p></div><div className="content-manager-actions"><button className="secondary-button" onClick={addBlock}><Plus size={15} /> Add block</button><button className="primary-button" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div></div><div className="content-block-layout"><aside className="content-block-list"><div className="content-block-list-head"><b>Block List ({blocks.length})</b><small>Saved sections</small></div>{blocks.map(block => <div className={`content-block-list-item-wrap ${selectedId === block.id ? 'selected' : ''}`} key={block.id}><button className="content-block-list-item" onClick={() => setSelectedId(block.id)}><span className="content-block-thumb">{block.image_url ? <img src={block.image_url} alt="" /> : <Code2 size={15} />}</span><span><b>{block.title || 'Untitled block'}</b><small>{block.active ? 'Active' : 'Inactive'}</small></span><ChevronRight size={14} /></button><button className="content-block-edit-button" type="button" onClick={() => setSelectedId(block.id)} aria-label={`Edit ${block.title || 'content block'}`} title="Edit block"><Edit3 size={14} /><span>Edit</span></button></div>)}{!blocks.length && <div className="content-block-empty"><Code2 size={18} /><span>No blocks saved yet.</span><button className="secondary-button" onClick={addBlock}>Add first block</button></div>}</aside><div className="content-block-editor">{selected ? <><div className="content-block-toolbar"><label>Block title<input value={selected.title} onChange={event => updateBlock({ title: event.target.value })} placeholder="Homepage introduction" /></label><label className="content-block-active"><input type="checkbox" checked={selected.active} onChange={event => updateBlock({ active: event.target.checked })} /> Active on storefront</label><button className="danger-button" onClick={removeBlock}><Trash2 size={14} /> Delete block</button></div><div className="content-editor-grid"><div className="content-editors"><label>HTML<textarea value={selected.html} onChange={event => updateBlock({ html: event.target.value })} placeholder="<section class='promo'>Fresh arrivals this week</section>" /></label><label>CSS<textarea value={selected.css} onChange={event => updateBlock({ css: event.target.value })} placeholder=".promo { padding: 48px; text-align: center; background: #f3f1ed; }" /></label><div className="content-inline-image"><div><label>Block image title<input value={selected.image_title} onChange={event => updateBlock({ image_title: event.target.value })} placeholder="Made for everyday living" /></label><small>Upload an image for this block. It will appear after the HTML in preview and on the public store.</small></div><label className="secondary-image-drop compact"><Upload size={18} /><b>{selected.image_url ? 'Replace block image' : 'Upload block image'}</b><input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => uploadBlockImage(event.target.files?.[0])} /></label></div></div><div className="content-live-preview"><span className="eyebrow">LIVE PREVIEW</span><iframe title={`Preview ${selected.title}`} srcDoc={blockPreview} sandbox="" /></div></div></> : <div className="content-no-selection"><Code2 size={26} /><h3>Create your first content block</h3><p>Use Add block to start writing a section in HTML and CSS.</p><button className="primary-button" onClick={addBlock}><Plus size={15} /> Add block</button></div>}</div></div><div className="secondary-image-manager"><div><span className="eyebrow">BELOW THE BANNER</span><h3>Secondary image</h3><p>Replace the image and edit its title from this screen. The title is shown with the image on the storefront.</p></div><label>Image title<input className="secondary-image-title" value={secondaryTitle} onChange={event => setSecondaryTitle(event.target.value)} placeholder="Craft N Sofa collection" /></label>{content.secondary_image_url ? <div className="secondary-image-row"><div><img src={content.secondary_image_url} alt={secondaryTitle || 'Secondary storefront preview'} /><small>{secondaryTitle || 'Craft N Sofa collection'}</small></div><label className="secondary-image-drop compact"><Upload size={18} /><b>Replace image</b><input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => uploadSecondary(event.target.files?.[0])} /></label><button className="danger-button" onClick={onClearSecondary} disabled={busy}>Remove image</button></div> : <label className="secondary-image-drop"><ImagePlus size={22} /><b>Upload image below the banner</b><small>JPG, PNG or WebP up to 10 MB</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => uploadSecondary(event.target.files?.[0])} /></label>}</div></section>;
}

function BrandingModal({ logoUrl, onClose, onSave, onRemove }: { logoUrl: string | null; onClose: () => void; onSave: (file: File) => Promise<void>; onRemove: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(logoUrl);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!file) { setPreview(logoUrl); return; }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, logoUrl]);
  const choose = (next: File | undefined) => {
    if (!next) return;
    if (!next.type.startsWith('image/')) return;
    if (next.size > 5 * 1024 * 1024) return;
    setFile(next);
  };
  const save = async () => { if (!file) return; setBusy(true); try { await onSave(file); } finally { setBusy(false); } };
  const remove = async () => { setBusy(true); try { await onRemove(); } finally { setBusy(false); } };
  return <div className="modal-backdrop" onClick={onClose}><div className="modal-card branding-modal" onClick={event => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">STORE SETTINGS</span><h2>Store logo</h2><p>Update the logo shown across your storefront.</p></div><button className="modal-close" onClick={onClose}><X size={18} /></button></div><div className="branding-preview">{preview ? <img src={preview} alt="Current store logo" /> : <div className="branding-placeholder">C<span>•</span>S</div>}</div><label className="branding-dropzone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); choose(event.dataTransfer.files[0]); }}><CloudUpload size={25} /><strong>{file ? file.name : 'Drop a new logo here'}</strong><small>or click to browse · PNG, JPG, SVG up to 5 MB</small><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={event => choose(event.target.files?.[0])} /></label><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button>{logoUrl && !file && <button className="danger-button" onClick={remove} disabled={busy}>Remove logo</button>}{file && <button className="primary-button" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save logo'}</button>}</div></div></div>;
}

function BannerUploadModal({ onClose, onSave }: { onClose: () => void; onSave: (file: File, altText: string) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState('Craft N Sofa collection');
  const [busy, setBusy] = useState(false);
  const choose = (next?: File) => { if (!next || !next.type.startsWith('image/') || next.size > 10 * 1024 * 1024) return; setFile(next); setPreview(URL.createObjectURL(next)); };
  const save = async () => { if (!file) return; setBusy(true); try { await onSave(file, altText); } finally { setBusy(false); } };
  return <Modal title="Add storefront banner" onClose={onClose}><p className="modal-intro">Upload a wide banner for the automatic storefront rotation.</p><label>Banner name<input value={altText} onChange={event => setAltText(event.target.value)} placeholder="e.g. Summer collection" /></label><div className="dropzone banner-dropzone" onClick={() => document.getElementById('banner-file-input')?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); choose(event.dataTransfer.files[0]); }}>{preview ? <img src={preview} alt="Banner preview" /> : <><CloudUpload size={29} /><b>Drop a 1500 × 500 banner here</b><span>or click to browse · JPG, PNG, WebP up to 10MB</span></>}<input id="banner-file-input" type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => choose(event.target.files?.[0])} /></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!file || busy} onClick={save}>{busy ? 'Uploading…' : 'Add banner'}</button></div></Modal> }
function ProductModal({ initial, categories, tags, onClose, onSave }: { initial: ProductForm; categories: Category[]; tags: AdminTag[]; onClose: () => void; onSave: (d: ProductForm) => void }) { const [form, setForm] = useState(initial); const [preview, setPreview] = useState(initial.image_url); const input = useRef<HTMLInputElement>(null); const choose = (file?: File) => { if (!file) return; if (!file.type.startsWith('image/')) return; setPreview(URL.createObjectURL(file)); setForm(f => ({ ...f, image_file: file, image_url: URL.createObjectURL(file) })); }; return <Modal title={initial.id ? 'Edit product' : 'Add product'} onClose={onClose}><div className="modal-grid"><label>Product name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cloud 3-Seater Sofa" /></label><label>Category<select value={form.category} onChange={e => { const category = categories.find(c => c.name === e.target.value); setForm({ ...form, category: e.target.value, category_id: category?.id || null }); }}>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></label><label>Selling price<input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></label><label>Cost price<input type="number" value={form.cost_price || 0} onChange={e => setForm({ ...form, cost_price: Number(e.target.value) })} /></label><label>Stock units<input type="number" value={form.stock || 0} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} /></label><label>Color options<input value={form.colors?.join(', ') || ''} onChange={e => setForm({ ...form, colors: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Beige, Charcoal" /></label><label>Tags<select multiple value={form.tags || []} onChange={e => setForm({ ...form, tags: Array.from(e.target.selectedOptions).map(option => (option as HTMLOptionElement).value) })}>{tags.filter(tag => tag.active).map(tag => <option key={tag.id} value={tag.name}>{tag.name}</option>)}</select><small className="field-help">Hold Ctrl/Cmd to select multiple tags.</small></label></div><label>Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe materials, dimensions and care..." /></label><div className="dropzone" onClick={() => input.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files[0]); }}>{preview ? <img src={preview} alt="Preview" /> : <><CloudUpload size={29} /><b>Drop product image here</b><span>or click to browse · JPG, PNG up to 10MB</span></>}<input ref={input} type="file" accept="image/*" hidden onChange={e => choose(e.target.files?.[0])} /></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!form.name.trim()} onClick={() => onSave(form)}><Check size={16} /> Save product</button></div></Modal> }

function CategoryModal({ categories, onClose, onSave, onUploadImage }: { categories: Category[]; onClose: () => void; onSave: (c: Category[]) => void | Promise<void>; onUploadImage: (file: File) => Promise<string> }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [parentId, setParentId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const choose = (next?: File) => { if (!next) return; setFile(next); setPreview(URL.createObjectURL(next)); };
  const add = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const image_url = file ? await onUploadImage(file) : null;
      await onSave([...categories, { id: uid(), name: name.trim(), description: desc.trim() || 'Custom product category', active: true, image_url, parent_id: parentId || null }]);
      setName(''); setDesc(''); setParentId(''); setFile(null); setPreview(null);
    } finally { setBusy(false); }
  };
  return <Modal title="Add category" onClose={onClose}>
    <p className="modal-intro">Create a visual category that appears on the storefront Shop By Category section.</p>
    <div className="category-form-layout">
      <div className="category-image-picker" onClick={() => input.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); choose(event.dataTransfer.files[0]); }}>
        {preview ? <img src={preview} alt="Category preview" /> : <><ImagePlus size={28} /><b>Category image</b><small>Recommended: 400 × 400 px</small></>}
        <input ref={input} type="file" accept="image/*" hidden onChange={event => choose(event.target.files?.[0])} />
      </div>
      <div className="category-form-fields">
        <label>Category name <span>*</span><input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Sofa Sets" /></label>
        <label>Slug <span>*</span><input value={name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')} readOnly placeholder="category-slug" /></label>
        <label>Parent category<select value={parentId} onChange={event => setParentId(event.target.value)}><option value="">Select (Optional)</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label>Description<textarea value={desc} onChange={event => setDesc(event.target.value)} placeholder="Enter category description" /></label>
      </div>
    </div>
    <div className="category-list">{categories.map(category => <div className="category-row" key={category.id}>{category.image_url ? <img className="category-row-thumb" src={category.image_url} alt="" /> : <div className="category-icon"><Tag size={16} /></div>}<div><b>{category.name}</b><small>{category.description}</small></div><button className="icon-button danger" onClick={() => onSave(categories.filter(item => item.id !== category.id))}><Trash2 size={15} /></button></div>)}</div>
    <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!name.trim() || busy} onClick={add}>{busy ? 'Saving…' : 'Save category'}</button></div>
  </Modal>
}
function CategoryListView({ categories, onAdd, onDelete }: { categories: Category[]; onAdd: () => void; onDelete: (id: string) => void }) {
  return <><section className="welcome-row"><div><span className="eyebrow">CATALOGUE</span><h2>Category List</h2><p>Organise products into clear collections for your team and customers.</p></div><button className="primary-button" onClick={onAdd}><Plus size={16} /> Add category</button></section><section className="panel category-list-page">{categories.map(category => <div className="category-row" key={category.id}><div className="category-icon"><Tag size={16} /></div><div><b>{category.name}</b><small>{category.description || 'No description'}</small></div><span className="status-pill">{category.active ? 'Active' : 'Hidden'}</span><button className="icon-button danger" onClick={() => onDelete(category.id)}><Trash2 size={15} /></button></div>)}{!categories.length && <div className="empty-state">No categories yet. Add your first category.</div>}</section></>;
}

function TagListView({ tags, onAdd, onDelete }: { tags: AdminTag[]; onAdd: () => void; onDelete: (id: string) => void }) {
  return <><section className="welcome-row"><div><span className="eyebrow">CATALOGUE</span><h2>Tag List</h2><p>Use tags to highlight products such as new arrivals, offers, and best sellers.</p></div><button className="primary-button" onClick={onAdd}><Plus size={16} /> Add tag</button></section><section className="panel category-list-page">{tags.map(tag => <div className="category-row" key={tag.id}><div className="category-icon"><Tag size={16} /></div><div><b>{tag.name}</b><small>{tag.description || 'No description'}</small></div><span className="status-pill">{tag.active ? 'Active' : 'Hidden'}</span><button className="icon-button danger" onClick={() => onDelete(tag.id)}><Trash2 size={15} /></button></div>)}{!tags.length && <div className="empty-state">No tags yet. Add your first tag.</div>}</section></>;
}

function TagModal({ tags, onClose, onSave }: { tags: AdminTag[]; onClose: () => void; onSave: (tags: AdminTag[]) => void | Promise<void> }) { const [name, setName] = useState(''); const [desc, setDesc] = useState(''); const add = () => { if (!name.trim()) return; onSave([...tags, { id: uid(), name: name.trim(), description: desc.trim() || 'Custom product tag', active: true }]); setName(''); setDesc(''); }; return <Modal title="Add tag" onClose={onClose}><p className="modal-intro">Create reusable labels that can be assigned to products.</p><div className="category-add"><input value={name} onChange={e => setName(e.target.value)} placeholder="Tag name" /><input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description" /><button className="primary-button" onClick={add}><Plus size={16} /></button></div><div className="category-list">{tags.map(tag => <div className="category-row" key={tag.id}><div className="category-icon"><Tag size={16} /></div><div><b>{tag.name}</b><small>{tag.description}</small></div><button className="icon-button danger" onClick={() => onSave(tags.filter(item => item.id !== tag.id))}><Trash2 size={15} /></button></div>)}</div><div className="modal-actions"><button className="primary-button" onClick={onClose}>Done</button></div></Modal> }

function ExpenseModal({ onClose, onSave }: { onClose: () => void; onSave: (e: Omit<Expense, 'id'>) => void }) { const [form, setForm] = useState({ title: '', category: 'Operations', amount: 0, date: today }); return <Modal title="Record an expense" onClose={onClose}><div className="modal-grid"><label>Expense title<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Electricity bill" /></label><label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option>Operations</option><option>Rent</option><option>Marketing</option><option>Logistics</option><option>Payroll</option><option>Other</option></select></label><label>Amount<input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></label><label>Date<input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!form.title || !form.amount} onClick={() => onSave(form)}><Check size={16} /> Record expense</button></div></Modal> }

function OrderDrawer({ order, onClose, onStatus }: { order: Order; onClose: () => void; onStatus: (id: string, s: OrderStatus) => void }) { return <div className="drawer-backdrop" onClick={onClose}><aside className="order-drawer" onClick={e => e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">ORDER DETAILS</span><h2>{order.id}</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="drawer-customer"><div className="customer-avatar">{order.customer.split(' ').map(s => s[0]).join('')}</div><div><b>{order.customer}</b><small>{order.location} · {order.payment}</small></div></div><div className="drawer-section"><label>Update status</label><div className="status-options">{(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map(s => <button className={order.status === s ? 'selected' : ''} key={s} onClick={() => onStatus(order.id, s)}><StatusPill status={s} /></button>)}</div></div><div className="drawer-section"><label>Order summary</label><div className="summary-line"><span>{order.items} products</span><b>{money(order.total)}</b></div><div className="summary-line"><span>Product cost</span><b>{money(order.cost)}</b></div><div className="summary-line total"><span>Gross profit</span><b>{money(order.total - order.cost)}</b></div></div><div className="timeline"><div className="timeline-item done"><span><Check size={12} /></span><div><b>Order placed</b><small>{order.date}</small></div></div><div className={`timeline-item ${order.status !== 'Pending' ? 'done' : ''}`}><span><ClipboardList size={12} /></span><div><b>Confirmed by team</b><small>Awaiting update</small></div></div><div className={`timeline-item ${['Shipped', 'Delivered'].includes(order.status) ? 'done' : ''}`}><span><Truck size={12} /></span><div><b>Out for delivery</b><small>Shipping status</small></div></div></div></aside></div> }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X size={18} /></button></div>{children}</div></div> }

export default App;
