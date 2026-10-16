import React from 'react';
import { CheckCircle, AlertTriangle, Download, Copy, LogOut } from 'lucide-react';

export default function Toast({ toast }) {
  if (!toast) return null;

  const renderIcon = () => {
    switch (toast.icon) {
      case 'check-circle':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'download':
        return <Download className="w-4 h-4 text-indigo-400" />;
      case 'clipboard':
        return <Copy className="w-4 h-4 text-indigo-400" />;
      case 'log-out':
        return <LogOut className="w-4 h-4 text-amber-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl bg-zinc-900/95 dark:bg-white/95 text-white dark:text-zinc-950 text-xs font-medium shadow-2xl backdrop-blur-md border border-zinc-800 dark:border-zinc-200 transition-all duration-300">
      {renderIcon()}
      <span>{toast.message}</span>
    </div>
  );
}
