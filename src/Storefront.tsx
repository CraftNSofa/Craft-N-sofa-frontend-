import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Menu, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import type { Product } from './types';
import { createStorefrontOrder, loadCategories, loadProducts, loadStoreBranding, subscribeToCatalogue, type RemoteCategory } from './lib/commerce';
import './storefront.css';

type CartLine = { product: Product; quantity: number };

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<RemoteCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState('All pieces');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', city: '', address: '' });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const refreshCatalogue = async () => {
      const [productResult, categoryResult, brandingResult] = await Promise.allSettled([loadProducts(), loadCategories(), loadStoreBranding()]);
      if (!active) return;
      if (productResult.status === 'fulfilled') setProducts(productResult.value);
      if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value);
      if (brandingResult.status === 'fulfilled') setLogoUrl(brandingResult.value.logo_url);
      setLoading(false);
    };
    void refreshCatalogue();
    const channel = subscribeToCatalogue(() => { void refreshCatalogue(); });
    return () => { active = false; void channel.unsubscribe(); };
  }, []);

  const filtered = useMemo(() => activeCategory === 'All pieces' ? products : products.filter(product => product.category === activeCategory), [activeCategory, products]);
  const total = cart.reduce((sum, line) => sum + line.quantity * (line.product.discount_price || line.product.price), 0);
  const add = (product: Product) => { setCart(current => { const existing = current.find(line => line.product.id === product.id); return existing ? current.map(line => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { product, quantity: 1 }]; }); setCartOpen(true); };
  const adjust = (id: string | number | undefined, amount: number) => setCart(current => current.flatMap(line => line.product.id === id ? (line.quantity + amount > 0 ? [{ ...line, quantity: line.quantity + amount }] : []) : [line]));
  const submitOrder = async (event: FormEvent) => { event.preventDefault(); if (!cart.length) return; await createStorefrontOrder({ customerName: form.name, customerEmail: form.email, address: { city: form.city, address: form.address }, items: cart.map(line => ({ productId: Number(line.product.id), name: line.product.name, quantity: line.quantity, sellingPrice: line.product.discount_price || line.product.price, costPrice: Number((line.product as Product & { cost_price?: number }).cost_price || 0) })) }); setCart([]); setCheckoutOpen(false); setSuccess(true); };

  return <div className="storefront">
    <header className="store-header"><a className="store-logo" href="/">{logoUrl ? <img src={logoUrl} alt="Craft N Sofa" /> : <><span>C</span>RAFT N SOFA</>}</a><nav className={menuOpen ? 'store-nav open' : 'store-nav'}><a href="#collection" onClick={() => { setActiveCategory('All pieces'); setMenuOpen(false); }}>Collection</a>{categories.slice(0, 5).map(category => <a href="#collection" key={category.id} onClick={() => { setActiveCategory(category.name); setMenuOpen(false); }}>{category.name}</a>)}<a href="#story" onClick={() => setMenuOpen(false)}>Our story</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a></nav><button className="store-cart" onClick={() => setCartOpen(true)}><ShoppingBag size={18} /><span>{cart.reduce((sum, line) => sum + line.quantity, 0)}</span></button><button className="store-menu" onClick={() => setMenuOpen(!menuOpen)}><Menu size={21} /></button></header>
    <main>
      <section className="store-hero"><div className="hero-copy"><span className="store-kicker">CRAFTED FOR SLOW LIVING</span><h1>Make room for<br /><em>good living.</em></h1><p>Hand-finished sofas and considered pieces made for the everyday moments that matter.</p><a className="store-button dark" href="#collection">Explore collection <ArrowRight size={16} /></a></div><div className="hero-art"><div className="hero-art-label">01 <span>CRAFT N SOFA</span></div></div></section>
      <section className="store-intro" id="story"><span className="store-kicker">THE CRAFT N SOFA WAY</span><h2>Quietly beautiful.<br /><em>Made to stay.</em></h2><p>We believe the best furniture does not ask for attention. It gives your home a feeling of ease, warmth and belonging.</p></section>
      <section className="collection" id="collection"><div className="section-heading"><div><span className="store-kicker">THE COLLECTION</span><h2>Pieces for living well.</h2></div><span className="piece-count">{products.length} pieces</span></div><div className="category-tabs"><button className={activeCategory === 'All pieces' ? 'active' : ''} onClick={() => setActiveCategory('All pieces')}>All pieces</button>{categories.map(category => <button className={activeCategory === category.name ? 'active' : ''} key={category.id} onClick={() => setActiveCategory(category.name)}>{category.name}</button>)}</div>{loading ? <div className="store-loading">Loading the collection…</div> : <div className="store-grid">{filtered.map(product => <article className="store-product" key={String(product.id)}><button className="product-visual" onClick={() => add(product)}>{product.image_url ? <img src={product.image_url} alt={product.name} /> : <div className="no-image">C<span>•</span>S</div>}<span className="quick-add">Add to bag <Plus size={15} /></span></button><div className="store-product-meta"><div><span>{product.category}</span><h3>{product.name}</h3></div><strong>{money(product.discount_price || product.price)}</strong></div></article>)}</div>}</section>
      <section className="store-banner"><div><span className="store-kicker">A HOME WITH SOUL</span><h2>Designed for the<br /><em>way you live.</em></h2></div><a className="store-button light" href="#collection">Shop all pieces <ArrowRight size={16} /></a></section>
    </main>
    <footer className="store-footer" id="contact"><div className="store-logo">{logoUrl ? <img src={logoUrl} alt="Craft N Sofa" /> : <><span>C</span>RAFT N SOFA</>}</div><p>Furniture with feeling.</p><small>© {new Date().getFullYear()} Craft N Sofa</small></footer>
    {cartOpen && <div className="cart-backdrop" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={event => event.stopPropagation()}><div className="cart-head"><div><span className="store-kicker">YOUR BAG</span><h2>{cart.length ? `${cart.reduce((sum, line) => sum + line.quantity, 0)} pieces` : 'Your bag is empty'}</h2></div><button onClick={() => setCartOpen(false)}><X size={20} /></button></div>{cart.length ? <><div className="cart-lines">{cart.map(line => <div className="cart-line" key={String(line.product.id)}><div className="cart-thumb">{line.product.image_url && <img src={line.product.image_url} alt="" />}</div><div><b>{line.product.name}</b><small>{money(line.product.discount_price || line.product.price)}</small><div className="quantity"><button onClick={() => adjust(line.product.id, -1)}><Minus size={13} /></button><span>{line.quantity}</span><button onClick={() => adjust(line.product.id, 1)}><Plus size={13} /></button></div></div></div>)}</div><div className="cart-total"><span>Total</span><strong>{money(total)}</strong></div><button className="store-button dark full" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Continue to details <ArrowRight size={16} /></button></> : <p className="empty-cart">Your considered pieces will appear here.</p>}</aside></div>}
    {checkoutOpen && <div className="cart-backdrop" onClick={() => setCheckoutOpen(false)}><div className="checkout-card" onClick={event => event.stopPropagation()}><div className="cart-head"><div><span className="store-kicker">DELIVERY DETAILS</span><h2>Almost yours.</h2></div><button onClick={() => setCheckoutOpen(false)}><X size={20} /></button></div><form onSubmit={submitOrder}><label>Name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label>Email<input type="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label><label>City<input required value={form.city} onChange={event => setForm({ ...form, city: event.target.value })} /></label><label>Address<textarea required value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} /></label><button className="store-button dark full">Place request <ArrowRight size={16} /></button></form></div></div>}
    {success && <div className="success-toast"><Check size={17} /><span>Thank you. Your order request is with our team.</span><button onClick={() => setSuccess(false)}><X size={15} /></button></div>}
  </div>;
}
