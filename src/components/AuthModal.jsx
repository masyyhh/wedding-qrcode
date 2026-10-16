import React, { useState } from 'react';
import { Lock, X, Eye, EyeOff } from 'lucide-react';

export default function AuthModal({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
  onShowToast
}) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters for security.');
      setIsSubmitting(false);
      return;
    }

    const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
    const payload = mode === 'signup' ? { email, password, name } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      onSuccess(data.token, data.user);
      onShowToast(
        mode === 'signup' ? 'Account created! Welcome.' : `Welcome back, ${data.user.name || data.user.email}!`,
        'check-circle'
      );
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseDemo = () => {
    setMode('login');
    setEmail('demo@qrstudio.com');
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center mx-auto mb-3 font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {mode === 'signup' ? 'Create Free Account' : 'Sign In to QR Patterns'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {mode === 'signup'
              ? 'Keep your QR codes private and track all scan activity'
              : 'Access your private QR codes and analytics'}
          </p>
        </div>

        {/* Tabs: Sign In / Create Account */}
        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              mode === 'login'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              mode === 'signup'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Your Name or Organization
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah & James"
                className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-3.5 pr-10 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-sm transition flex items-center justify-center space-x-1.5 disabled:opacity-60"
          >
            <span>{isSubmitting ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
          </button>

        </form>

        {/* Quick Demo Fill Shortcut */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <button
            type="button"
            onClick={handleUseDemo}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white underline transition"
          >
            ⚡ Quick fill demo account: <span className="font-mono text-zinc-700 dark:text-zinc-300">demo@qrstudio.com</span>
          </button>
        </div>

      </div>
    </div>
  );
}
