import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

export default function EditLinkModal({
  link,
  token,
  onClose,
  onUpdated,
  onShowToast
}) {
  const [title, setTitle] = useState(link?.title || '');
  const [originalUrl, setOriginalUrl] = useState(link?.original_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!link) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/links/${link.short_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title, originalUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update destination');

      onUpdated(data.link);
      onShowToast('Destination URL updated! Physical QR redirects instantly.', 'check-circle');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 space-y-5">
        
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            Edit Dynamic QR Destination
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Campaign Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              New Destination URL
            </label>
            <input
              type="url"
              required
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              Scanners will immediately be redirected to this new address without reprinting your QR code.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition flex items-center space-x-1.5 disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Update Destination'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
