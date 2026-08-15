import React from 'react';
import { Package, Star, AlertTriangle, IndianRupee, Layers } from 'lucide-react';
import { Product } from '../types';

interface StatsOverviewProps {
  products: Product[];
  selectedCategory: string;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ products, selectedCategory }) => {
  const filteredProducts = selectedCategory === 'ALL'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const totalProducts = filteredProducts.length;
  const featuredCount = filteredProducts.filter(p => p.featured).length;
  const outOfStockCount = filteredProducts.filter(p => (p.stock || 0) <= 0).length;
  const lowStockCount = filteredProducts.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 5).length;

  const totalInventoryValue = filteredProducts.reduce((sum, p) => {
    const activePrice = p.discount_price ?? p.price;
    return sum + (activePrice * (p.stock || 0));
  }, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Star className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Featured Items</p>
          <p className="text-2xl font-bold text-gray-900">{featuredCount}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          outOfStockCount > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Alerts</p>
          <p className="text-2xl font-bold text-gray-900">
            {outOfStockCount} <span className="text-xs font-normal text-gray-500">out ({lowStockCount} low)</span>
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
          <IndianRupee className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory Value</p>
          <p className="text-xl font-bold text-gray-900">
            Rs. {totalInventoryValue.toLocaleString('en-IN')}
          </p>
        </div>
      </div>
    </div>
  );
};
