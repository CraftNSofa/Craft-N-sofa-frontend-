import React from 'react';
import { Edit3, Trash2, Copy, Star } from 'lucide-react';
import { Product } from '../types';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string | number) => void;
  onDuplicate: (product: Product) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4">Item</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Stock</th>
              <th className="py-3 px-4">Colors</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {products.map((p) => {
              const mainImg = p.image_url || (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=200';
              const activePrice = p.discount_price ?? p.price;

              return (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={mainImg}
                        alt={p.name}
                        className="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-gray-200 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=200';
                        }}
                      />
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          {p.name}
                          {p.featured && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 inline" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-1 max-w-xs">{p.description}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="inline-block text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                      {p.category || '-'}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-semibold text-gray-900">
                    Rs. {activePrice?.toLocaleString('en-IN')}
                    {p.discount_price !== null && p.discount_price !== undefined && p.discount_price < p.price && (
                      <span className="block text-[10px] text-gray-400 line-through font-normal">
                        Rs. {p.price?.toLocaleString('en-IN')}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        (p.stock || 0) <= 0
                          ? 'bg-red-100 text-red-700'
                          : (p.stock || 0) < 5
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {p.stock || 0}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-xs text-gray-600 max-w-[150px] truncate">
                    {Array.isArray(p.colors) && p.colors.length > 0 ? p.colors.join(', ') : '-'}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onDuplicate(p)}
                        className="p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(p)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
