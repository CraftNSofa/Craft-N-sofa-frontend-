import React, { useState, useEffect, useRef } from 'react';
import {
  PlusCircle,
  Save,
  X,
  Image as ImageIcon,
  UploadCloud,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Link,
  Plus
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { uploadImageToSupabase } from '../config/supabase';

interface ProductFormProps {
  editingProduct: Product | null;
  onSave: (productData: Omit<Product, 'id'> & { id?: string | number }) => Promise<void>;
  onCancel: () => void;
  categories: string[];
  isSaving: boolean;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  editingProduct,
  onSave,
  onCancel,
  categories,
  isSaving,
}) => {
  const [id, setId] = useState<string | number | undefined>(undefined);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [colors, setColors] = useState('');
  const [description, setDescription] = useState('');
  
  // Images state
  const [imageUrl, setImageUrl] = useState('');
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [featured, setFeatured] = useState('false');

  // Image Uploading States
  const [isMainUploading, setIsMainUploading] = useState(false);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showManualUrlInputs, setShowManualUrlInputs] = useState(false);

  // File Inputs
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProduct) {
      setId(editingProduct.id);
      setName(editingProduct.name || '');
      setDescription(editingProduct.description || '');
      setPrice(
        editingProduct.price !== undefined && editingProduct.price !== null
          ? String(editingProduct.price)
          : ''
      );
      setDiscountPrice(
        editingProduct.discount_price !== undefined && editingProduct.discount_price !== null
          ? String(editingProduct.discount_price)
          : editingProduct.original_price !== undefined && editingProduct.original_price !== null
          ? String(editingProduct.original_price)
          : ''
      );

      const cat = editingProduct.category || '';
      if (categories.includes(cat)) {
        setCategory(cat);
        setCustomCategory('');
      } else if (cat) {
        setCategory('CUSTOM');
        setCustomCategory(cat);
      } else {
        setCategory('');
        setCustomCategory('');
      }

      setImageUrl(editingProduct.image_url || '');
      setColors(Array.isArray(editingProduct.colors) ? editingProduct.colors.join(', ') : '');
      setImagesList(Array.isArray(editingProduct.images) ? editingProduct.images : []);
      setStock(editingProduct.stock !== undefined ? String(editingProduct.stock) : '0');
      setFeatured(editingProduct.featured ? 'true' : 'false');
      setUploadError(null);
    } else {
      clearForm();
    }
  }, [editingProduct, categories]);

  const clearForm = () => {
    setId(undefined);
    setName('');
    setCategory('');
    setCustomCategory('');
    setPrice('');
    setDiscountPrice('');
    setStock('0');
    setColors('');
    setDescription('');
    setImageUrl('');
    setImagesList([]);
    setFeatured('false');
    setUploadError(null);
    setUploadProgress(0);
  };

  // Main Image Upload Handler
  const handleMainFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP, etc.).');
      return;
    }

    setIsMainUploading(true);
    setUploadError(null);
    setUploadProgress(10);

    try {
      const publicUrl = await uploadImageToSupabase(file, (percent) => setUploadProgress(percent));
      setImageUrl(publicUrl);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setUploadError(err.message || 'Failed to upload image to Supabase Storage.');
    } finally {
      setIsMainUploading(false);
      if (mainFileInputRef.current) mainFileInputRef.current.value = '';
    }
  };

  // Gallery Images Upload Handler (Multiple files)
  const handleGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsGalleryUploading(true);
    setUploadError(null);

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const publicUrl = await uploadImageToSupabase(file);
        uploadedUrls.push(publicUrl);
      }

      setImagesList((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      console.error('Gallery image upload failed:', err);
      setUploadError(err.message || 'Error uploading gallery images.');
    } finally {
      setIsGalleryUploading(false);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
    }
  };

  const removeGalleryImage = (indexToRemove: number) => {
    setImagesList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedCat = category === 'CUSTOM' ? customCategory.trim() : category;

    if (!name.trim()) {
      setUploadError('Product name is required.');
      return;
    }

    if (!selectedCat) {
      setUploadError('Category is required.');
      return;
    }

    const parsedColors = colors
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    const numPrice = Number(price || 0);
    const numDiscount = discountPrice.trim() === '' ? null : Number(discountPrice);
    const numStock = Number(stock || 0);

    const productPayload = {
      ...(id ? { id } : {}),
      name: name.trim(),
      description: description.trim(),
      price: numPrice,
      discount_price: numDiscount,
      original_price: numDiscount,
      category: selectedCat,
      image_url: imageUrl.trim(),
      images: imagesList,
      colors: parsedColors,
      stock: numStock,
      featured: featured === 'true',
      updated_at: new Date().toISOString(),
    };

    await onSave(productPayload);
  };

  return (
    <div id="productFormContainer" className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 mb-8 transition-all">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
        <div>
          <h2 id="formTitle" className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Upload images directly to Supabase Storage and manage product details.
          </p>
        </div>

        {editingProduct && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Cancel Editing
          </button>
        )}
      </div>

      {uploadError && (
        <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="p-1 hover:bg-red-100 rounded">
            <X className="w-3.5 h-3.5 text-red-700" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input type="hidden" id="productId" value={id || ''} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          
          {/* Product Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Modern Velvet Sofa"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium text-gray-800"
            >
              <option value="">Select Category</option>
              <option value="Sofa">Sofa</option>
              <option value="Sofa Set">Sofa Set</option>
              <option value="Corner Sofa">Corner Sofa</option>
              <option value="Bed">Bed</option>
              <option value="Chair">Chair</option>
              <option value="Table">Table</option>
              <option value="Furniture">Furniture</option>
              <option value="CUSTOM">+ Add Custom Category</option>
            </select>

            {category === 'CUSTOM' && (
              <input
                type="text"
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Type new category name..."
                className="w-full mt-2 px-3.5 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Price (Rs.) <span className="text-red-500">*</span>
            </label>
            <input
              id="price"
              type="number"
              required
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Discount Price */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Discount Price / Sale Price (Rs.) <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              id="discount_price"
              type="number"
              min="0"
              value={discountPrice}
              onChange={(e) => setDiscountPrice(e.target.value)}
              placeholder="e.g. 45000"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Stock */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Stock Units
            </label>
            <input
              id="stock"
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Colors */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Available Colors <span className="text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <input
              id="colors"
              type="text"
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              placeholder="Black, Grey, Brown"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Product Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write detailed product features, dimensions, material type..."
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-y min-h-[90px]"
            />
          </div>

          {/* Main Product Image Section (DIRECT FILE UPLOAD TO SUPABASE STORAGE) */}
          <div className="md:col-span-2 bg-purple-50/40 p-4 rounded-xl border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-purple-600" />
                Main Product Image Upload <span className="text-red-500">*</span>
              </label>
              
              <button
                type="button"
                onClick={() => setShowManualUrlInputs(!showManualUrlInputs)}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
              >
                <Link className="w-3 h-3" />
                {showManualUrlInputs ? 'Hide URL input' : 'Enter URL manually'}
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Select an image file from your device. It will upload directly to Supabase Storage and create a public link.
            </p>

            {/* File Upload Box */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                ref={mainFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleMainFileChange}
                className="hidden"
                id="main-file-upload"
              />

              <label
                htmlFor="main-file-upload"
                className={`flex-1 w-full border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-3 cursor-pointer transition-all ${
                  isMainUploading
                    ? 'bg-purple-100 border-purple-400 opacity-80'
                    : 'bg-white hover:bg-purple-50/60 border-purple-200 hover:border-purple-400'
                }`}
              >
                {isMainUploading ? (
                  <div className="flex items-center gap-2 text-purple-700 font-semibold text-xs py-1">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Uploading image to Supabase... ({uploadProgress}%)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-purple-900 font-bold text-xs py-1">
                    <UploadCloud className="w-5 h-5 text-purple-600" />
                    <span>Select Image from Device / Drag & Drop</span>
                  </div>
                )}
              </label>

              {/* Main Image Preview Thumbnail */}
              {imageUrl && (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border-2 border-purple-300 shrink-0 shadow-xs group">
                  <img
                    src={imageUrl}
                    alt="Main Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=200';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Optional Manual URL Input */}
            {showManualUrlInputs && (
              <div className="mt-3 pt-3 border-t border-purple-100">
                <input
                  id="image_url"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://zvkeixogcslxnehplbby.supabase.co/storage/v1/object/public/product-images/..."
                  className="w-full px-3 py-2 text-xs bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* Multiple Gallery Product Images Upload */}
          <div className="md:col-span-2 bg-gray-50/80 p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                Additional Gallery Images (Multiple Uploads)
              </label>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Upload multiple product angles or detail shots directly to Supabase Storage.
            </p>

            <div className="flex flex-col gap-3">
              <input
                ref={galleryFileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleGalleryFilesChange}
                className="hidden"
                id="gallery-file-upload"
              />

              <div className="flex items-center gap-3">
                <label
                  htmlFor="gallery-file-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 shadow-xs cursor-pointer transition-colors ${
                    isGalleryUploading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {isGalleryUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  ) : (
                    <Plus className="w-4 h-4 text-purple-600" />
                  )}
                  <span>{isGalleryUploading ? 'Uploading Files...' : '+ Upload Gallery Images'}</span>
                </label>

                {imagesList.length > 0 && (
                  <span className="text-xs font-semibold text-gray-600">
                    {imagesList.length} gallery {imagesList.length === 1 ? 'image' : 'images'} attached
                  </span>
                )}
              </div>

              {/* Gallery Image Previews List */}
              {imagesList.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {imagesList.map((url, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group bg-white shadow-xs">
                      <img
                        src={url}
                        alt={`Gallery ${idx}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=200';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Featured Product Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Featured Product
            </label>
            <select
              id="featured"
              value={featured}
              onChange={(e) => setFeatured(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium text-gray-800"
            >
              <option value="false">No</option>
              <option value="true">Yes (Showcase on Storefront)</option>
            </select>
          </div>

        </div>

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          {editingProduct && (
            <button
              id="cancel"
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSaving || isMainUploading || isGalleryUploading}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl shadow-md shadow-purple-200 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving to Supabase...' : editingProduct ? 'Update Product' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
};
