import React, { useState } from 'react';
import { BarChart3, Search, Copy, ExternalLink, Trash2, Edit2, ShieldAlert } from 'lucide-react';

export default function AnalyticsDashboard({
  user,
  overview,
  links,
  onOpenAnalyticsModal,
  onOpenEditModal,
  onDeleteLink,
  onOpenAuth,
  onShowToast
}) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!user) {
    return (
      <section id="analytics-hub" className="mt-16 pt-12 border-t border-zinc-200/80 dark:border-zinc-800/80">
        <div className="relative rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 p-8 sm:p-12 text-center backdrop-blur-sm overflow-hidden">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold tracking-tight">Private Analytics Dashboard</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Sign in to unlock private scan tracking, real-time engagement velocity, device breakdown charts, and dynamic destination editing.
            </p>
            <div className="pt-2 flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition shadow-sm"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const filteredLinks = links.filter((link) => {
    const q = searchTerm.toLowerCase();
    return (
      (link.title || '').toLowerCase().includes(q) ||
      (link.short_id || '').toLowerCase().includes(q) ||
      (link.original_url || '').toLowerCase().includes(q)
    );
  });

  const handleCopyLink = (shortUrl) => {
    navigator.clipboard.writeText(shortUrl);
    onShowToast('Trackable link copied to clipboard!', 'clipboard');
  };

  return (
    <section id="analytics-hub" className="mt-16 pt-12 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-8">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold tracking-tight">My QR Analytics</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
              Private Hub
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Real-time engagement telemetry and dynamic destination management for all your codes.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
          />
        </div>
      </div>

      {/* Global KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Active QR Codes</div>
          <div className="mt-2 text-3xl font-bold font-mono text-zinc-900 dark:text-white">
            {overview?.totalCodes || links.length || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Lifetime Scans</div>
          <div className="mt-2 text-3xl font-bold font-mono text-zinc-900 dark:text-white">
            {overview?.totalScans || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Today's Scans</div>
          <div className="mt-2 text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {overview?.todayScans || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Top Performer</div>
          <div className="mt-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
            {overview?.topLink?.title || 'None yet'}
          </div>
          <div className="text-[11px] font-mono text-zinc-400">
            {overview?.topLink ? `${overview.topLink.scan_count} scans` : '—'}
          </div>
        </div>
      </div>

      {/* Tracked Codes Table */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200/80 dark:border-zinc-800/80 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              <tr>
                <th className="py-3 px-4">Campaign / Title</th>
                <th className="py-3 px-4">Shortlink & Target</th>
                <th className="py-3 px-4 text-center">Scans</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-zinc-400 text-xs">
                    No tracked QR codes found. Enable tracking and save a QR code to monitor analytics here.
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => (
                  <tr key={link.short_id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {link.title || 'Untitled Campaign'}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase font-mono mt-0.5">
                        {link.content_type || 'url'} • {new Date(link.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 space-y-1">
                      <div className="flex items-center space-x-1.5 font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                        <a href={link.short_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {link.short_url}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(link.short_url)}
                          title="Copy shortlink"
                          className="p-1 hover:text-zinc-900 dark:hover:text-white transition"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <a
                          href={link.short_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open target"
                          className="p-1 hover:text-zinc-900 dark:hover:text-white transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate max-w-xs font-mono">
                        → {link.original_url}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white">
                        {link.scan_count || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenAnalyticsModal(link.short_id)}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-medium text-xs hover:bg-zinc-800 dark:hover:bg-zinc-100 transition flex items-center space-x-1"
                        >
                          <BarChart3 className="w-3 h-3" />
                          <span>Analytics</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEditModal(link)}
                          title="Edit destination URL"
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteLink(link.short_id)}
                          title="Delete QR code"
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </section>
  );
}
