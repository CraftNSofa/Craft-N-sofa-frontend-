import React from 'react';
import { Edit3, Trash2, Copy, Star, Palette, Layers, Eye } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string | number) => void;
  onDuplicate: (product: Product) => void;
  onImageClick?: (url: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onDuplicate,
  onImageClick,
}) => {
  const mainImage = product.image_url || (product.images && product.images[0]) || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=400';

  const hasDiscount = product.discount_price !== null && product.discount_price !== undefined && product.discount_price < product.price;

  const stockLevel = product.stock || 0;
  const isOutOfStock = stockLevel <= 0;
  const isLowStock = stockLevel > 0 && stockLevel < 5;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col md:flex-row group">
      {/* Image Section */}
      <div className="relative md:w-48 h-48 md:h-auto shrink-0 bg-gray-100 overflow-hidden">
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=400';
          }}
        />

        {/* Featured Tag */}
        {product.featured && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
            <Star className="w-3 h-3 fill-current" />
            Featured
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute bottom-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
            SALE
          </div>
        )}

        {/* Image view button */}
        {onImageClick && (
          <button
            onClick={() => onImageClick(mainImage)}
            className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            title="View full image"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Details Section */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <span className="inline-block text-[11px] font-bold text-purple-600 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-md mb-1">
                {product.category || 'Furniture'}
              </span>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                {product.name}
              </h3>
            </div>

            {/* Stock Tag */}
            <span
              className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                isOutOfStock
                  ? 'bg-red-100 text-red-700'
                  : isLowStock
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isOutOfStock ? 'Out of stock' : `${stockLevel} in stock`}
            </span>
          </div>

          <p className="text-xs text-gray-500 line-clamp-2 mb-3">
            {product.description || 'No description provided.'}
          </p>

          {/* Pricing & Colors */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold text-gray-900">
                Rs. {(hasDiscount ? product.discount_price : product.price)?.toLocaleString('en-IN')}
              </span>
              {hasDiscount && (
                <span className="text-xs font-medium text-gray-400 line-through">
                  Rs. {product.price?.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {/* Color chips */}
            {product.colors && product.colors.length > 0 && (
              <div className="flex items-center gap-1">
                <Palette className="w-3 h-3 text-gray-400" />
                <span className="text-[11px] text-gray-600 truncate max-w-[150px]">
                  {product.colors.join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-100">
          <button
            onClick={() => onDuplicate(product)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Duplicate product"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </button>

          <button
            onClick={() => onEdit(product)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>

          <button
            onClick={() => onDelete(product.id)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
