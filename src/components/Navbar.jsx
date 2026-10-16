import React from 'react';
import { QrCode, Sun, Moon, LogOut } from 'lucide-react';

export default function Navbar({
  user,
  trackedCount,
  isDark,
  onToggleTheme,
  onOpenAuth,
  onLogout
}) {
  const userInitials = user ? (user.name || user.email).slice(0, 2).toUpperCase() : '';

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200/80 dark:border-zinc-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <a href="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold tracking-tight shadow-sm transition-transform group-hover:scale-105">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-lg tracking-tight">QR Patterns</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono font-medium border border-zinc-200 dark:border-zinc-700">v2.0</span>
          </div>
        </a>

        {/* Quick Nav Links */}
        <nav className="hidden md:flex items-center space-x-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <a href="#creator-section" className="px-3 py-1.5 rounded-lg hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition">
            Creator
          </a>
          <a href="#analytics-hub" className="px-3 py-1.5 rounded-lg hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition flex items-center space-x-1.5">
            <span>My Analytics</span>
            <span className="px-1.5 py-0.2 rounded-full text-xs font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {trackedCount}
            </span>
          </a>
        </nav>

        {/* Controls & Auth */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Auth Container */}
          {user ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium">
                <span className="w-5 h-5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center text-[10px] font-bold">
                  {userInitials}
                </span>
                <span className="max-w-[120px] truncate text-zinc-800 dark:text-zinc-200 font-medium">
                  {user.name || user.email}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition shadow-sm"
              >
                Create Account
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
