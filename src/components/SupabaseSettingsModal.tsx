import React, { useState } from 'react';
import { X, Database, RotateCcw, Check, Copy, Code2, ShieldAlert } from 'lucide-react';
import {
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_KEY,
  saveSupabaseConfig,
  resetSupabaseConfig,
  getSupabaseConfig,
  SUPABASE_SQL_SETUP_SCRIPT
} from '../config/supabase';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
  isDemoMode: boolean;
  onToggleDemoMode: (val: boolean) => void;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
  isDemoMode,
  onToggleDemoMode,
}) => {
  const current = getSupabaseConfig();
  const [url, setUrl] = useState(current.url);
  const [apiKey, setApiKey] = useState(current.apiKey);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sql'>('config');
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(url, apiKey);
    setIsSaved(true);
    onConfigUpdated();
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  const handleReset = () => {
    resetSupabaseConfig();
    setUrl(DEFAULT_SUPABASE_URL);
    setApiKey(DEFAULT_SUPABASE_KEY);
    onConfigUpdated();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1000);
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-gray-100 flex flex-col max-h-[90vh]">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Supabase Connection & Storage Settings</h3>
            <p className="text-xs text-gray-500">Database connection credentials and Storage RLS setup scripts.</p>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Database Credentials
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Supabase Storage & Table SQL Setup
          </button>
        </div>

        {activeTab === 'config' ? (
          <form onSubmit={handleSave} className="space-y-4 overflow-y-auto pr-1">
            
            {/* Mode Indicator */}
            <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-purple-900">Storage & API Mode</p>
                  <p className="text-[11px] text-purple-700">
                    Connected live to Supabase REST API & Storage bucket.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Publishable API Key (Anon / Service)
              </label>
              <input
                type="text"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {isSaved && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                Settings saved successfully!
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-purple-700 bg-gray-100 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">
                Run this SQL script in your Supabase SQL Editor to create the <code className="font-mono text-purple-700 bg-purple-50 px-1 py-0.5 rounded">products</code> table and <code className="font-mono text-purple-700 bg-purple-50 px-1 py-0.5 rounded">product-images</code> storage bucket.
              </p>
              <button
                type="button"
                onClick={copySqlToClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Setup'}</span>
              </button>
            </div>

            <pre className="bg-slate-900 text-purple-300 p-4 rounded-xl text-[11px] font-mono overflow-auto flex-1 border border-slate-800 leading-relaxed select-all">
              {SUPABASE_SQL_SETUP_SCRIPT}
            </pre>

            <div className="pt-4 border-t border-gray-100 flex justify-end mt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
