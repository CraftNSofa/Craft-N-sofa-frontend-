import React, { useState } from 'react';
import { ShieldCheck, LogIn, KeyRound, Sparkles, Database } from 'lucide-react';
import { getSupabaseConfig, getAuthHeaders } from '../config/supabase';

interface LoginModalProps {
  onLoginSuccess: (token: string, email: string, isDemo: boolean) => void;
  onOpenSettings: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onOpenSettings }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setMessage({ text: 'Email aur password enter karo.', error: true });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const config = getSupabaseConfig();

    try {
      const res = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({
          text: data.error_description || data.msg || 'Login failed. Please check credentials.',
          error: true,
        });
        setIsLoading(false);
        return;
      }

      const token = data.access_token || 'mock_token';
      localStorage.setItem('supabase_token', token);
      localStorage.setItem('admin_email', trimmedEmail);
      
      onLoginSuccess(token, trimmedEmail, false);
    } catch (err) {
      console.error(err);
      setMessage({
        text: 'Supabase connection error. You can click "Demo Admin Access" below to preview immediately.',
        error: true,
      });
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoToken = 'demo_admin_access_token';
    const demoEmail = email.trim() || 'admin@craftnsofa.com';
    localStorage.setItem('supabase_token', demoToken);
    localStorage.setItem('admin_email', demoEmail);
    onLoginSuccess(demoToken, demoEmail, true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden border border-purple-100">
        
        {/* Top Decorative accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600" />

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white font-black text-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-300">
            CS
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            CRAFT <span className="text-purple-600">N</span> SOFA
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 mt-1">
            Admin Backend Portal
          </p>
        </div>

        {/* Status / Error Message */}
        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold mb-5 flex items-start gap-2 ${
              message.error
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Admin Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@craftnsofa.com"
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-sm rounded-xl shadow-md shadow-purple-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {isLoading ? 'Authenticating...' : 'Login to Supabase'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-2 text-center">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Instant Demo Access (Bypass Auth)
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="text-[11px] text-gray-500 hover:text-purple-700 font-medium inline-flex items-center justify-center gap-1 py-1"
          >
            <Database className="w-3 h-3" />
            Configure Supabase URL / API Key
          </button>
        </div>

      </div>
    </div>
  );
};
