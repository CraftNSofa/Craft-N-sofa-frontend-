import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
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
import type { Product } from './types';
import { INITIAL_SAMPLE_PRODUCTS } from './config/supabase';
import { clearStoreLogo, createExpense, deleteCategory, deleteProduct as deleteRemoteProduct, getCurrentUser, loadCategories, loadExpenses, loadOrders, loadProducts, loadStoreBranding, signInAdmin, signOutAdmin, subscribeToOrders, updateOrderStatus as updateRemoteOrderStatus, upsertCategory, saveProduct as saveRemoteProduct, uploadProductImage, uploadStoreLogo } from './lib/commerce';
import { getSupabaseClient } from './config/supabase';

type Tab = 'overview' | 'products' | 'orders' | 'finance' | 'settings';
type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
type Category = { id: string; name: string; description: string; active: boolean };
type Order = { id: string; customer: string; location: string; items: number; total: number; cost: number; status: OrderStatus; date: string; payment: 'Paid' | 'Pending' };
type Expense = { id: string; title: string; category: string; amount: number; date: string };

type ProductForm = { id?: string; name: string; description: string; price: number; discount_price: number | null; original_price: number | null; category: string; category_id?: string | null; image_url: string; images: string[]; colors: string[]; stock: number; featured: boolean; cost_price: number; published?: boolean; image_file?: File };

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;
const today = new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

const starterCategories: Category[] = [
  { id: 'cat-1', name: 'Sofas', description: 'Signature seating for living spaces', active: true },
  { id: 'cat-2', name: 'Bedroom', description: 'Beds and bedroom furniture', active: true },
  { id: 'cat-3', name: 'Chairs', description: 'Accent and dining chairs', active: true },
  { id: 'cat-4', name: 'Tables', description: 'Coffee, side and dining tables', active: true },
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
  const [mobileNav, setMobileNav] = useState(false);
  const [products, setProducts] = usePersisted<Product[]>('cns_products', INITIAL_SAMPLE_PRODUCTS);
  const [categories, setCategories] = usePersisted<Category[]>('cns_categories', starterCategories);
  const [orders, setOrders] = usePersisted<Order[]>('cns_orders', starterOrders);
  const [expenses, setExpenses] = usePersisted<Expense[]>('cns_expenses', starterExpenses);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    getCurrentUser().then(async user => {
      if (!active || !user) return;
      setSession(true);
      const results = await Promise.allSettled([loadProducts(), loadCategories(), loadOrders(), loadExpenses(), loadStoreBranding()]);
      if (!active) return;
      const [productResult, categoryResult, orderResult, expenseResult, brandingResult] = results;
      if (productResult.status === 'fulfilled') setProducts(productResult.value);
      if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value.map(category => ({ id: category.id, name: category.name, description: category.description || '', active: category.active })));
      if (orderResult.status === 'fulfilled') setOrders(orderResult.value.map(order => ({ id: order.id, customer: order.customer_name, location: String(order.shipping_address?.city || 'Online'), items: order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0, total: Number(order.total), cost: order.order_items?.reduce((sum, item) => sum + Number(item.cost_price) * item.quantity, 0) || 0, status: ({ pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' } as Record<string, OrderStatus>)[order.status] || 'Pending', date: order.created_at.slice(0, 10), payment: order.payment_status === 'paid' ? 'Paid' : 'Pending' })));
      if (expenseResult.status === 'fulfilled') setExpenses(expenseResult.value.map(expense => ({ id: expense.id, title: expense.title, category: expense.category, amount: Number(expense.amount), date: expense.expense_date })));
      if (brandingResult.status === 'fulfilled') setBrandLogoUrl(brandingResult.value.logo_url);
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
  const [expenseModal, setExpenseModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandingModal, setBrandingModal] = useState(false);

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
    { id: 'products', label: 'Products & Categories', icon: Package },
    { id: 'orders', label: 'Live Orders', icon: ShoppingBag, badge: orders.filter(o => ['Pending', 'Confirmed', 'Processing'].includes(o.status)).length },
    { id: 'finance', label: 'Finance & Reports', icon: CircleDollarSign },
    { id: 'settings', label: 'Store Settings', icon: Settings },
  ] as const;

  const openNewProduct = () => setProductModal({ name: '', description: '', price: 0, discount_price: null, original_price: null, category: activeCategories[0]?.name || '', category_id: activeCategories[0]?.id || null, image_url: '', images: [], colors: [], stock: 0, featured: false, cost_price: 0, published: true });
  const saveProduct = async (data: ProductForm) => {
    try {
      let imageUrl = data.image_url;
      if (data.image_file && remoteReady) imageUrl = await uploadProductImage(data.image_file);
      const selectedCategory = activeCategories.find(category => category.name === data.category);
      const item = { ...data, category_id: data.category_id || selectedCategory?.id || null, image_url: imageUrl, images: imageUrl ? [imageUrl, ...(data.images || []).filter(image => !image.startsWith('blob:'))] : data.images, id: data.id || undefined, created_at: data.id ? undefined : new Date().toISOString(), updated_at: new Date().toISOString() } as Product;
      const saved = remoteReady ? await saveRemoteProduct(item) : item;
      setProducts(prev => data.id ? prev.map(p => p.id === data.id ? saved : p) : [saved, ...prev]); setProductModal(null); showToast(data.id ? 'Product updated' : 'Product added to catalogue');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Could not save product'); }
  };
  const deleteProduct = async (id?: string | number) => { if (id !== undefined && window.confirm('Remove this product from the catalogue?')) { try { if (remoteReady) await deleteRemoteProduct(id); setProducts(prev => prev.filter(p => p.id !== id)); showToast('Product removed'); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not remove product'); } } };
  const saveCategories = async (next: Category[]) => { const previousIds = new Set(categories.map(category => category.id)); const nextIds = new Set(next.map(category => category.id)); const added = next.filter(category => !previousIds.has(category.id)); const removed = categories.filter(category => !nextIds.has(category.id)); try { if (!remoteReady) { setCategories(next); return; } const savedAdded = await Promise.all(added.map(category => upsertCategory({ name: category.name, description: category.description, active: category.active }))); await Promise.all(removed.map(category => deleteCategory(category.id))); setCategories([...next.filter(category => previousIds.has(category.id)), ...savedAdded.map(category => ({ id: category.id, name: category.name, description: category.description || '', active: category.active }))]); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not update categories'); } };
  const updateOrder = async (id: string, status: OrderStatus) => { try { const previous = orders.find(order => order.id === id)?.status; if (remoteReady) await updateRemoteOrderStatus(id, status.toLowerCase(), previous?.toLowerCase()); setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o)); setSelectedOrder(prev => prev ? { ...prev, status } : prev); showToast(`Order ${id} marked ${status.toLowerCase()}`); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not update order'); } };
  const logout = async () => { await signOutAdmin(); setSession(false); setRemoteReady(false); };

  if (!session) return <LoginScreen onLogin={() => setSession(true)} />;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-mark">C<span>•</span>S</div><div><b>Craft N Sofa</b><small>Admin workspace</small></div><button className="close-nav" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(item => <button key={item.id} className={tab === item.id ? 'nav-item active' : 'nav-item'} onClick={() => { setTab(item.id); setMobileNav(false); }}><item.icon size={18} /><span>{item.label}</span>{'badge' in item && item.badge ? <em>{item.badge}</em> : null}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Bell size={17} /></div><b>Stay on top of orders</b><p>Turn on notifications when connecting your live store.</p></div><button className="nav-item logout" onClick={logout}><span className="avatar">AM</span><span className="user-name">Admin Manager</span><ChevronDown size={15} /></button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="menu-button" onClick={() => setMobileNav(true)}><Menu size={21} /></button><div><div className="eyebrow">SATURDAY, AUGUST 15, 2026</div><h1>{nav.find(n => n.id === tab)?.label}</h1></div><div className="top-actions"><div className="store-status"><span /> Store is live <small>●</small></div><button className="icon-button"><Bell size={18} /></button><div className="top-avatar">AM</div></div></header>
      {toast && <div className="toast"><Check size={16} /> {toast}</div>}
      <div className="page-body">
        {tab === 'overview' && <Overview revenue={revenue} grossProfit={grossProfit} netProfit={netProfit} orders={orders} lowStock={lowStock} expenseTotal={expenseTotal} onOrders={() => setTab('orders')} onProducts={() => setTab('products')} />}
        {tab === 'products' && <ProductsView products={filteredProducts} categories={categories} query={query} onQuery={setQuery} onNew={openNewProduct} onEdit={p => setProductModal({ ...p, id: String(p.id) } as ProductForm)} onDelete={deleteProduct} onCategories={() => setCategoryModal(true)} />}
        {tab === 'orders' && <OrdersView orders={orders} onStatus={updateOrder} onSelect={setSelectedOrder} query={query} onQuery={setQuery} />}
        {tab === 'finance' && <FinanceView revenue={revenue} productCost={productCost} grossProfit={grossProfit} netProfit={netProfit} expenses={expenses} onExpense={() => setExpenseModal(true)} />}
        {tab === 'settings' && <StoreSettingsView logoUrl={brandLogoUrl} onChangeLogo={() => setBrandingModal(true)} onRemove={async () => { try { if (!remoteReady) throw new Error('Connect the admin workspace before changing branding'); await clearStoreLogo(brandLogoUrl); setBrandLogoUrl(null); showToast('Store logo removed'); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not remove logo'); } }} />}
      </div>
    </main>
    {productModal && <ProductModal initial={productModal} categories={activeCategories} onClose={() => setProductModal(null)} onSave={saveProduct} />}
    {categoryModal && <CategoryModal categories={categories} onClose={() => setCategoryModal(false)} onSave={saveCategories} />}
    {expenseModal && <ExpenseModal onClose={() => setExpenseModal(false)} onSave={async e => { try { const saved = remoteReady ? await createExpense({ title: e.title, category: e.category, amount: e.amount, expense_date: e.date }) : { ...e, id: uid() }; setExpenses(prev => [({ id: saved.id, title: saved.title, category: saved.category, amount: Number(saved.amount), date: 'expense_date' in saved ? saved.expense_date : saved.date } as Expense), ...prev]); setExpenseModal(false); showToast('Expense recorded in ledger'); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not record expense'); } }} />}
    {selectedOrder && <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatus={updateOrder} />}
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
  return <><section className="welcome-row"><div><h2>Good morning, Admin.</h2><p>Here’s what’s happening with your store today.</p></div><div className="date-filter">Last 30 days <ChevronDown size={15} /></div></section><section className="stats-grid"><StatCard label="Total revenue" value={money(revenue)} change="12.8%" icon={TrendingUp} tone="purple" /><StatCard label="Gross profit" value={money(grossProfit)} change="8.4%" icon={WalletCards} tone="green" /><StatCard label="Orders" value={String(orders.length + 124)} change="6.2%" icon={ShoppingBag} tone="blue" /><StatCard label="Operating expenses" value={money(expenseTotal)} icon={ClipboardList} tone="amber" /></section><section className="dashboard-grid"><div className="panel chart-panel"><div className="panel-heading"><div><h3>Sales velocity</h3><p>Revenue across the last 7 days</p></div><span className="legend"><i /> Revenue</span></div><div className="chart-wrap"><div className="y-axis"><span>₹1.0L</span><span>₹75k</span><span>₹50k</span><span>₹25k</span><span>₹0</span></div><div className="bars">{[42, 56, 48, 72, 65, 82, 76].map((v, i) => <div className="bar-col" key={i}><div className="bar" style={{ height: `${(v / max) * 100}%` }}><b>{i === 5 ? '₹82k' : ''}</b></div><small>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</small></div>)}</div></div></div><div className="panel attention-panel"><div className="panel-heading"><div><h3>Needs attention</h3><p>Quick actions for today</p></div><AlertCircle size={18} className="muted" /></div><button className="attention-item" onClick={onOrders}><span className="attention-number red">{orders.filter(o => o.status === 'Pending').length}</span><span><b>Orders awaiting confirmation</b><small>Review and confirm new orders</small></span><ArrowUpRight size={16} /></button><button className="attention-item" onClick={onProducts}><span className="attention-number amber">{lowStock}</span><span><b>Products low in stock</b><small>Restock before you run out</small></span><ArrowUpRight size={16} /></button><div className="profit-mini"><span>Net profit this month</span><b>{money(netProfit)}</b><small><ArrowUpRight size={13} /> 14.6% vs last month</small></div></div></section><section className="panel recent-panel"><div className="panel-heading"><div><h3>Recent orders</h3><p>Latest activity from your storefront</p></div><button className="text-button" onClick={onOrders}>View all orders <ArrowUpRight size={15} /></button></div><OrderTable orders={orders.slice(0, 4)} compact /></section></>;
}

function ProductsView({ products, categories, query, onQuery, onNew, onEdit, onDelete, onCategories }: { products: Product[]; categories: Category[]; query: string; onQuery: (s: string) => void; onNew: () => void; onEdit: (p: Product) => void; onDelete: (id?: string | number) => void; onCategories: () => void }) { return <><section className="welcome-row"><div><h2>Catalogue management</h2><p>Add products, manage stock and keep your categories tidy.</p></div><div className="button-row"><button className="secondary-button" onClick={onCategories}><Tag size={16} /> Manage categories</button><button className="primary-button" onClick={onNew}><Plus size={17} /> Add product</button></div></section><div className="toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={e => onQuery(e.target.value)} placeholder="Search products..." /></div><span className="result-count">{products.length} products</span></div><section className="product-grid">{products.map(p => <div className="product-tile" key={String(p.id)}><div className="product-image">{p.image_url ? <img src={p.image_url} alt={p.name} /> : <div className="image-placeholder"><ImagePlus size={25} /></div>}<span className={p.stock < 5 ? 'stock-badge low' : 'stock-badge'}>{p.stock < 5 ? 'Low stock' : 'In stock'}</span><div className="tile-actions"><button onClick={() => onEdit(p)}><Edit3 size={15} /></button><button onClick={() => onDelete(p.id)}><Trash2 size={15} /></button></div></div><div className="product-info"><div className="product-category">{p.category}</div><h3>{p.name}</h3><div className="product-bottom"><b>{money(p.discount_price || p.price)}</b><span>{p.stock || 0} units</span></div></div></div>)}{!products.length && <div className="empty-state"><Package size={30} /><h3>No products found</h3><p>Try a different search or add your first product.</p></div>}</section><div className="storage-note"><CloudUpload size={18} /><span><b>Image storage ready</b><small>Drag files into the product form. Images upload to the connected Supabase Storage bucket and appear on the storefront.</small></span></div></> }

function OrdersView({ orders, onStatus, onSelect, query, onQuery }: { orders: Order[]; onStatus: (id: string, s: OrderStatus) => void; onSelect: (o: Order) => void; query: string; onQuery: (s: string) => void }) { const shown = orders.filter(o => `${o.id} ${o.customer} ${o.location} ${o.status}`.toLowerCase().includes(query.toLowerCase())); return <><section className="welcome-row"><div><h2>Live order desk</h2><p>Track incoming orders and keep customers moving.</p></div><div className="live-indicator"><span /> Live updates enabled</div></section><div className="toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={e => onQuery(e.target.value)} placeholder="Search order, customer or city..." /></div><button className="secondary-button"><Download size={16} /> Export report</button></div><section className="panel order-panel"><OrderTable orders={shown} onStatus={onStatus} onSelect={onSelect} /></section></> }

function OrderTable({ orders, compact = false, onStatus, onSelect }: { orders: Order[]; compact?: boolean; onStatus?: (id: string, s: OrderStatus) => void; onSelect?: (o: Order) => void }) { return <div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th>{!compact && <th />}</tr></thead><tbody>{orders.map(o => <tr key={o.id} onClick={() => onSelect?.(o)}><td><b className="order-id">{o.id}</b></td><td><b>{o.customer}</b><small>{o.location}</small></td><td>{o.items}</td><td><b>{money(o.total)}</b><small className="paid">{o.payment}</small></td><td>{onStatus ? <select className="status-select" value={o.status} onClick={e => e.stopPropagation()} onChange={e => onStatus(o.id, e.target.value as OrderStatus)}>{(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map(s => <option key={s}>{s}</option>)}</select> : <StatusPill status={o.status} />}</td><td>{o.date}</td>{!compact && <td><button className="row-arrow" onClick={e => { e.stopPropagation(); onSelect?.(o); }}><ArrowUpRight size={16} /></button></td>}</tr>)}</tbody></table></div> }

function FinanceView({ revenue, productCost, grossProfit, netProfit, expenses, onExpense }: { revenue: number; productCost: number; grossProfit: number; netProfit: number; expenses: Expense[]; onExpense: () => void }) { const margin = revenue ? Math.round((grossProfit / revenue) * 100) : 0; const expenseGroups = expenses.reduce<Record<string, number>>((a, e) => { a[e.category] = (a[e.category] || 0) + e.amount; return a; }, {}); return <><section className="welcome-row"><div><h2>Finance & reports</h2><p>Understand where your money is coming from and going.</p></div><div className="button-row"><button className="secondary-button"><Download size={16} /> Export CSV</button><button className="primary-button" onClick={onExpense}><Plus size={17} /> Record expense</button></div></section><section className="finance-grid"><StatCard label="Captured revenue" value={money(revenue)} change="12.8%" icon={ArrowUpRight} tone="purple" /><StatCard label="Product cost" value={money(productCost)} icon={ArrowDownRight} tone="amber" /><StatCard label="Gross margin" value={`${margin}%`} change="3.1%" icon={BarChart3} tone="green" /><StatCard label="Net profit" value={money(netProfit)} change="14.6%" icon={CircleDollarSign} tone="blue" /></section><section className="dashboard-grid"><div className="panel ledger-panel"><div className="panel-heading"><div><h3>Financial ledger</h3><p>Revenue and cost snapshots from paid orders</p></div><span className="ledger-date">August 2026</span></div><div className="ledger-lines"><div><span className="ledger-dot green" /><span>Sales revenue</span><b>{money(revenue)}</b></div><div><span className="ledger-dot amber" /><span>Product cost of goods</span><b className="negative">− {money(productCost)}</b></div><div><span className="ledger-dot purple" /><span>Gross profit</span><b>{money(grossProfit)}</b></div><div><span className="ledger-dot red" /><span>Operating expenses</span><b className="negative">− {money(expenses.reduce((s, e) => s + e.amount, 0))}</b></div><div className="ledger-total"><span>Net operating profit</span><b>{money(netProfit)}</b></div></div></div><div className="panel expense-panel"><div className="panel-heading"><div><h3>Expense breakdown</h3><p>Operating costs by category</p></div><ClipboardList size={18} className="muted" /></div><div className="expense-bars">{Object.entries(expenseGroups).map(([name, amount], i) => <div className="expense-bar-row" key={name}><div><span>{name}</span><b>{money(amount)}</b></div><div className="track"><i style={{ width: `${Math.max(12, amount / Math.max(...Object.values(expenseGroups)) * 100)}%`, background: ['#7c3aed', '#f59e0b', '#10b981', '#3b82f6'][i % 4] }} /></div></div>)}</div></div></section><section className="panel recent-panel"><div className="panel-heading"><div><h3>Expense tracker</h3><p>Every operational expense in one place</p></div><button className="text-button" onClick={onExpense}>Add expense <Plus size={15} /></button></div><div className="expense-list">{expenses.map(e => <div className="expense-row" key={e.id}><div className="expense-icon"><ClipboardList size={16} /></div><div><b>{e.title}</b><small>{e.category} · {e.date}</small></div><strong>{money(e.amount)}</strong></div>)}</div></section></> }

function StoreSettingsView({ logoUrl, onChangeLogo, onRemove }: { logoUrl: string | null; onChangeLogo: () => void; onRemove: () => Promise<void> }) {
  return <><section className="welcome-row"><div><h2>Store Settings</h2><p>Manage the identity customers see on your Craft N Sofa website.</p></div></section><section className="settings-grid"><div className="panel settings-card"><div className="panel-heading"><div><span className="eyebrow">BRAND IDENTITY</span><h3>Website logo</h3><p>This logo appears in the public website header and footer.</p></div><Settings size={18} className="muted" /></div><div className="settings-logo-preview">{logoUrl ? <img src={logoUrl} alt="Current store logo" /> : <div className="branding-placeholder">C<span>•</span>S</div>}</div><div className="settings-card-actions"><button className="primary-button" onClick={onChangeLogo}><Upload size={16} /> {logoUrl ? 'Replace logo' : 'Add website logo'}</button>{logoUrl && <button className="danger-button" onClick={onRemove}>Remove logo</button>}</div><small className="settings-help">Recommended: a transparent PNG or SVG. Maximum size 5 MB.</small></div><div className="panel settings-card settings-info"><span className="eyebrow">LIVE PREVIEW</span><h3>Where it appears</h3><div className="settings-location"><span>01</span><div><b>Public header</b><small>Top navigation of your storefront</small></div></div><div className="settings-location"><span>02</span><div><b>Public footer</b><small>Brand signature at the bottom of the website</small></div></div><a href="/" target="_blank" rel="noreferrer" className="secondary-button">Open public store <ArrowUpRight size={15} /></a></div></section></>;
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

function ProductModal({ initial, categories, onClose, onSave }: { initial: ProductForm; categories: Category[]; onClose: () => void; onSave: (d: ProductForm) => void }) { const [form, setForm] = useState(initial); const [preview, setPreview] = useState(initial.image_url); const input = useRef<HTMLInputElement>(null); const choose = (file?: File) => { if (!file) return; if (!file.type.startsWith('image/')) return; setPreview(URL.createObjectURL(file)); setForm(f => ({ ...f, image_file: file, image_url: URL.createObjectURL(file) })); }; return <Modal title={initial.id ? 'Edit product' : 'Add product'} onClose={onClose}><div className="modal-grid"><label>Product name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cloud 3-Seater Sofa" /></label><label>Category<select value={form.category} onChange={e => { const category = categories.find(c => c.name === e.target.value); setForm({ ...form, category: e.target.value, category_id: category?.id || null }); }}>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></label><label>Selling price<input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></label><label>Cost price<input type="number" value={form.cost_price || 0} onChange={e => setForm({ ...form, cost_price: Number(e.target.value) })} /></label><label>Stock units<input type="number" value={form.stock || 0} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} /></label><label>Color options<input value={form.colors?.join(', ') || ''} onChange={e => setForm({ ...form, colors: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Beige, Charcoal" /></label></div><label>Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe materials, dimensions and care..." /></label><div className="dropzone" onClick={() => input.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files[0]); }}>{preview ? <img src={preview} alt="Preview" /> : <><CloudUpload size={29} /><b>Drop product image here</b><span>or click to browse · JPG, PNG up to 10MB</span></>}<input ref={input} type="file" accept="image/*" hidden onChange={e => choose(e.target.files?.[0])} /></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!form.name.trim()} onClick={() => onSave(form)}><Check size={16} /> Save product</button></div></Modal> }

function CategoryModal({ categories, onClose, onSave }: { categories: Category[]; onClose: () => void; onSave: (c: Category[]) => void | Promise<void> }) { const [name, setName] = useState(''); const [desc, setDesc] = useState(''); const add = () => { if (!name.trim()) return; onSave([...categories, { id: uid(), name: name.trim(), description: desc.trim() || 'Custom product category', active: true }]); setName(''); setDesc(''); }; return <Modal title="Manage categories" onClose={onClose}><p className="modal-intro">Create simple categories your team can understand. Products can be assigned while creating or editing.</p><div className="category-add"><input value={name} onChange={e => setName(e.target.value)} placeholder="New category name" /><input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description" /><button className="primary-button" onClick={add}><Plus size={16} /></button></div><div className="category-list">{categories.map(c => <div className="category-row" key={c.id}><div className="category-icon"><Tag size={16} /></div><div><b>{c.name}</b><small>{c.description}</small></div><button className="icon-button danger" onClick={() => onSave(categories.filter(x => x.id !== c.id))}><Trash2 size={15} /></button></div>)}</div><div className="modal-actions"><button className="primary-button" onClick={onClose}>Done</button></div></Modal> }

function ExpenseModal({ onClose, onSave }: { onClose: () => void; onSave: (e: Omit<Expense, 'id'>) => void }) { const [form, setForm] = useState({ title: '', category: 'Operations', amount: 0, date: today }); return <Modal title="Record an expense" onClose={onClose}><div className="modal-grid"><label>Expense title<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Electricity bill" /></label><label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option>Operations</option><option>Rent</option><option>Marketing</option><option>Logistics</option><option>Payroll</option><option>Other</option></select></label><label>Amount<input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></label><label>Date<input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!form.title || !form.amount} onClick={() => onSave(form)}><Check size={16} /> Record expense</button></div></Modal> }

function OrderDrawer({ order, onClose, onStatus }: { order: Order; onClose: () => void; onStatus: (id: string, s: OrderStatus) => void }) { return <div className="drawer-backdrop" onClick={onClose}><aside className="order-drawer" onClick={e => e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">ORDER DETAILS</span><h2>{order.id}</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="drawer-customer"><div className="customer-avatar">{order.customer.split(' ').map(s => s[0]).join('')}</div><div><b>{order.customer}</b><small>{order.location} · {order.payment}</small></div></div><div className="drawer-section"><label>Update status</label><div className="status-options">{(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map(s => <button className={order.status === s ? 'selected' : ''} key={s} onClick={() => onStatus(order.id, s)}><StatusPill status={s} /></button>)}</div></div><div className="drawer-section"><label>Order summary</label><div className="summary-line"><span>{order.items} products</span><b>{money(order.total)}</b></div><div className="summary-line"><span>Product cost</span><b>{money(order.cost)}</b></div><div className="summary-line total"><span>Gross profit</span><b>{money(order.total - order.cost)}</b></div></div><div className="timeline"><div className="timeline-item done"><span><Check size={12} /></span><div><b>Order placed</b><small>{order.date}</small></div></div><div className={`timeline-item ${order.status !== 'Pending' ? 'done' : ''}`}><span><ClipboardList size={12} /></span><div><b>Confirmed by team</b><small>Awaiting update</small></div></div><div className={`timeline-item ${['Shipped', 'Delivered'].includes(order.status) ? 'done' : ''}`}><span><Truck size={12} /></span><div><b>Out for delivery</b><small>Shipping status</small></div></div></div></aside></div> }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X size={18} /></button></div>{children}</div></div> }

export default App;
