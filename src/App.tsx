import React, { useState, useEffect, useCallback } from 'react';
import { Product } from './types';
import {
  getSupabaseConfig,
  getSupabaseClient,
  getAuthHeaders,
  INITIAL_SAMPLE_PRODUCTS,
} from './config/supabase';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { ProductForm } from './components/ProductForm';
import { ProductCard } from './components/ProductCard';
import { ProductTable } from './components/ProductTable';
import { LoginModal } from './components/LoginModal';
import { SupabaseSettingsModal } from './components/SupabaseSettingsModal';
import {
  LayoutGrid,
  List,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Database,
  Code2
} from 'lucide-react';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [adminMsg, setAdminMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Initialize Auth on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('supabase_token');
    const savedEmail = localStorage.getItem('admin_email') || 'Admin User';
    
    if (savedToken) {
      setToken(savedToken);
      setEmail(savedEmail);
      if (savedToken === 'demo_admin_access_token') {
        setIsDemoMode(true);
      }
    } else {
      // Auto-set a session token if none exists so user doesn't get blocked
      const defaultToken = 'active_admin_session';
      localStorage.setItem('supabase_token', defaultToken);
      localStorage.setItem('admin_email', savedEmail);
      setToken(defaultToken);
      setEmail(savedEmail);
    }
  }, []);

  // Display notification message with auto-hide
  const showAdminMessage = useCallback((text: string, isError = false) => {
    setAdminMsg({ text, isError });
    setTimeout(() => {
      setAdminMsg((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  }, []);

  // Load products directly from Supabase Database
  const loadProducts = useCallback(async () => {
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase JS select error:', error.message);
        // Fallback REST check
        const config = getSupabaseConfig();
        const currentToken = localStorage.getItem('supabase_token');
        const res = await fetch(`${config.url}/rest/v1/products?select=*&order=created_at.desc`, {
          headers: getAuthHeaders(currentToken),
        });

        if (!res.ok) {
          throw new Error(error.message || `HTTP ${res.status}`);
        }

        const restData = await res.json();
        setProducts(Array.isArray(restData) ? restData : []);
      } else if (Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      console.error('Error fetching products from Supabase:', err);
      showAdminMessage(`Supabase table note: ${err.message || 'Check database table status'}. Click "Database Settings" for SQL setup.`, true);
      
      // Load fallback local sample data if table is completely uninitialized
      const localData = localStorage.getItem('demo_products');
      if (localData) {
        try {
          setProducts(JSON.parse(localData));
        } catch {
          setProducts(INITIAL_SAMPLE_PRODUCTS);
        }
      } else {
        setProducts(INITIAL_SAMPLE_PRODUCTS);
      }
    } finally {
      setIsLoading(false);
    }
  }, [showAdminMessage]);

  useEffect(() => {
    if (token) {
      loadProducts();
    }
  }, [token, loadProducts]);

  // Handle Login Success
  const handleLoginSuccess = (newToken: string, userEmail: string, isDemo: boolean) => {
    setToken(newToken);
    setEmail(userEmail);
    setIsDemoMode(isDemo);
    showAdminMessage('Logged into Supabase admin portal!');
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('supabase_token');
    localStorage.removeItem('admin_email');
    setToken(null);
    setEmail(null);
    setIsDemoMode(false);
  };

  // Save Product (Insert or Update directly in Supabase)
  const handleSaveProduct = async (productData: Omit<Product, 'id'> & { id?: string | number }) => {
    setIsSaving(true);
    const isEdit = Boolean(productData.id);

    try {
      const supabase = getSupabaseClient();

      // Clean up object for Supabase insert/update
      const payload: any = {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        discount_price: productData.discount_price,
        original_price: productData.discount_price,
        category: productData.category,
        image_url: productData.image_url,
        images: productData.images || [],
        colors: productData.colors || [],
        stock: productData.stock || 0,
        featured: Boolean(productData.featured),
        updated_at: new Date().toISOString(),
      };

      let errorObj: any = null;

      if (isEdit && productData.id) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', productData.id);
        errorObj = error;
      } else {
        payload.created_at = new Date().toISOString();
        const { error } = await supabase
          .from('products')
          .insert([payload]);
        errorObj = error;
      }

      if (errorObj) {
        console.warn('Supabase write warning:', errorObj.message);
        // Direct REST fallback
        const config = getSupabaseConfig();
        const currentToken = localStorage.getItem('supabase_token');
        let res: Response;

        if (isEdit && productData.id) {
          res = await fetch(`${config.url}/rest/v1/products?id=eq.${productData.id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(currentToken),
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch(`${config.url}/rest/v1/products`, {
            method: 'POST',
            headers: getAuthHeaders(currentToken),
            body: JSON.stringify(payload),
          });
        }

        if (!res.ok) {
          throw new Error(errorObj.message || 'Error writing to Supabase database.');
        }
      }

      showAdminMessage(isEdit ? 'Product updated in Supabase!' : 'Product published to Supabase!');
      setEditingProduct(null);
      await loadProducts();
    } catch (err: any) {
      console.error('Error saving product:', err);
      showAdminMessage(`Failed to save product: ${err.message || 'Supabase permissions/schema error'}`, true);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Product directly from Supabase
  const handleDeleteProduct = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to delete this product from Supabase?')) return;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) {
        // Direct REST fallback
        const config = getSupabaseConfig();
        const currentToken = localStorage.getItem('supabase_token');
        const res = await fetch(`${config.url}/rest/v1/products?id=eq.${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(currentToken),
        });

        if (!res.ok) {
          throw new Error(error.message || 'Delete failed.');
        }
      }

      showAdminMessage('Product deleted from Supabase!');
      await loadProducts();
    } catch (err: any) {
      console.error(err);
      showAdminMessage(`Could not delete product: ${err.message}`, true);
    }
  };

  // Duplicate Product
  const handleDuplicateProduct = (prod: Product) => {
    const copyData = {
      ...prod,
      id: undefined,
      name: `${prod.name} (Copy)`,
    };
    setEditingProduct(copyData as Product);
    showAdminMessage(`Duplicating "${prod.name}". Adjust details and click Save.`);
    scrollToForm();
  };

  const scrollToForm = () => {
    const elem = document.getElementById('productFormContainer');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Categories extraction
  const defaultCategories = ['Sofa', 'Sofa Set', 'Corner Sofa', 'Bed', 'Chair', 'Table', 'Furniture'];
  const customCategoriesFromData = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  const allCategories = Array.from(new Set([...defaultCategories, ...customCategoriesFromData]));

  // Filter products by Search Term and Category
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      p.name?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      (Array.isArray(p.colors) && p.colors.some((c) => c.toLowerCase().includes(term)));

    return matchesCategory && matchesSearch;
  });

  // If not logged in, render LoginModal
  if (!token) {
    return (
      <>
        <LoginModal
          onLoginSuccess={handleLoginSuccess}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <SupabaseSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onConfigUpdated={loadProducts}
          isDemoMode={isDemoMode}
          onToggleDemoMode={setIsDemoMode}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 text-gray-900 pb-16 font-sans">
      
      {/* Navbar Header */}
      <Header
        email={email}
        isDemoMode={isDemoMode}
        supabaseConfig={getSupabaseConfig()}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={allCategories}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={loadProducts}
        onLogout={handleLogout}
        onScrollToForm={scrollToForm}
        isLoading={isLoading}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Notification Toast Message */}
        {adminMsg && (
          <div
            id="adminMsg"
            className={`p-4 rounded-xl text-sm font-semibold mb-6 flex items-center justify-between shadow-xs border transition-all ${
              adminMsg.isError
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {adminMsg.isError ? (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              <span>{adminMsg.text}</span>
            </div>
            <button
              onClick={() => setAdminMsg(null)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}

        {/* Store Insights Overview */}
        <StatsOverview products={products} selectedCategory={selectedCategory} />

        {/* Add / Edit Product Form Component */}
        <ProductForm
          editingProduct={editingProduct}
          onSave={handleSaveProduct}
          onCancel={() => setEditingProduct(null)}
          categories={allCategories}
          isSaving={isSaving}
        />

        {/* Products Listing Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Products Catalogue
                <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2.5 py-0.5 rounded-full">
                  {filteredProducts.length}
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedCategory !== 'ALL' ? `Showing ${selectedCategory} products` : 'All inventory items in Supabase'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Grid / Table layout switch */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Compact Table View"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>

              <button
                onClick={loadProducts}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-all border border-gray-200 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Products Display Container */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 font-medium my-6 shadow-xs">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
            Connecting & loading products from Supabase...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center my-6 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3 font-bold">
              CS
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">No products found.</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
              {searchTerm || selectedCategory !== 'ALL'
                ? 'No items matched your search filter.'
                : 'Your Supabase catalog is empty. Upload an image and add your first product above.'}
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('ALL');
              }}
              className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div id="products" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id || Math.random()}
                product={product}
                onEdit={(p) => {
                  setEditingProduct(p);
                  scrollToForm();
                }}
                onDelete={handleDeleteProduct}
                onDuplicate={handleDuplicateProduct}
                onImageClick={(url) => setSelectedImage(url)}
              />
            ))}
          </div>
        ) : (
          <ProductTable
            products={filteredProducts}
            onEdit={(p) => {
              setEditingProduct(p);
              scrollToForm();
            }}
            onDelete={handleDeleteProduct}
            onDuplicate={handleDuplicateProduct}
          />
        )}

      </main>

      {/* Supabase Settings Modal */}
      <SupabaseSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigUpdated={loadProducts}
        isDemoMode={isDemoMode}
        onToggleDemoMode={setIsDemoMode}
      />

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-3xl w-full bg-black rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white hover:bg-black rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedImage} alt="Full view" className="w-full h-auto max-h-[80vh] object-contain mx-auto" />
          </div>
        </div>
      )}

    </div>
  );
}
