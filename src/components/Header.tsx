import React from 'react';
import { LogOut, Database, Layers, Search, PlusCircle, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { SupabaseConfig } from '../types';

interface HeaderProps {
  email: string | null;
  isDemoMode: boolean;
  supabaseConfig: SupabaseConfig;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedCategory: string;
  onCategoryChange: (val: string) => void;
  categories: string[];
  onOpenSettings: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  onScrollToForm: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  email,
  isDemoMode,
  supabaseConfig,
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  onOpenSettings,
  onRefresh,
  onLogout,
  onScrollToForm,
  isLoading,
}) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-700 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-purple-200">
                CS
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight text-gray-900 leading-none">
                  CRAFT <span className="text-purple-600">N</span> SOFA
                </div>
                <div className="text-xs font-semibold text-gray-500 mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  Product Backend & Inventory Portal
                </div>
              </div>
            </div>

            {/* Mobile Logout / Status */}
            <div className="flex items-center md:hidden gap-2">
              <button
                onClick={onOpenSettings}
                className="p-2 text-gray-600 hover:text-purple-700 rounded-lg bg-gray-100 hover:bg-purple-50 transition-colors"
                title="Supabase Settings"
              >
                <Database className="w-4 h-4" />
              </button>
              <button
                onClick={onLogout}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Search and Filter Controls */}
          <div className="flex-1 max-w-xl mx-0 md:mx-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search products by name, color, or description..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="py-2 px-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium text-gray-700"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Action Tools & User Info */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onScrollToForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all hover:shadow cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Add Product
            </button>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`p-2 text-gray-600 hover:text-purple-700 bg-gray-100 hover:bg-purple-50 rounded-lg transition-colors border border-gray-200 ${
                isLoading ? 'animate-spin text-purple-600' : ''
              }`}
              title="Refresh Products"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenSettings}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                isDemoMode
                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isDemoMode ? 'Demo / Local' : 'Supabase Connected'}</span>
            </button>

            <div className="h-6 w-px bg-gray-200 my-auto" />

            <div className="text-right">
              <p className="text-xs font-semibold text-gray-800 truncate max-w-[140px]">
                {email || 'Admin User'}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                Administrator
              </p>
            </div>

            <button
              onClick={onLogout}
              className="inline-flex items-center justify-center p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
