import React, { useState, useEffect } from 'react';
import { X, Calendar, Link, Download, Play, BarChart3, Smartphone, Laptop, Globe } from 'lucide-react';

export default function AnalyticsModal({
  shortId,
  token,
  onClose,
  onShowToast
}) {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hoveredBar, setHoveredBar] = useState(null);

  const fetchAnalytics = async () => {
    if (!shortId || !token) return;
    try {
      const res = await fetch(`/api/links/${shortId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load analytics');
      setAnalytics(data);
    } catch (err) {
      onShowToast(err.message, 'alert-triangle');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [shortId, token]);

  const handleSimulateScan = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch(`/api/links/${shortId}/simulate-scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Simulation failed');
      onShowToast(`Simulated scan recorded from ${data.scan.deviceType} (${data.scan.os})`, 'check-circle');
      await fetchAnalytics();
    } catch (err) {
      onShowToast(err.message, 'alert-triangle');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch(`/api/links/${shortId}/export-csv`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to download CSV');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-scans-${shortId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onShowToast('CSV exported successfully!', 'download');
    } catch (err) {
      onShowToast(err.message, 'alert-triangle');
    }
  };

  if (!shortId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                {analytics?.link?.title || 'Campaign Analytics'}
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                {analytics?.link?.content_type || 'URL'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center space-x-1 font-mono text-indigo-600 dark:text-indigo-400">
                <Link className="w-3.5 h-3.5" />
                <a href={analytics?.link?.shortUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  {analytics?.link?.shortUrl}
                </a>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Created {analytics?.link ? new Date(analytics.link.created_at).toLocaleDateString() : '—'}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-zinc-400 text-xs">
            Loading real-time analytics...
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Total Scans</div>
                <div className="mt-1 text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                  {analytics.overview?.totalScans || 0}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Unique Scanners</div>
                <div className="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {analytics.overview?.uniqueScanners || 0}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Last Scan</div>
                <div className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {analytics.overview?.lastScannedAt ? new Date(analytics.overview.lastScannedAt).toLocaleString() : 'Never'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Actions</div>
                <div className="mt-1 flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleSimulateScan}
                    disabled={isSimulating}
                    title="Simulate test scan"
                    className="p-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    title="Download CSV report"
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 7-Day Velocity Chart */}
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center space-x-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  <span>Scan Velocity (Past 7 Days)</span>
                </div>
                {hoveredBar && (
                  <div className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
                    {hoveredBar.date}: <span className="font-bold text-zinc-900 dark:text-white">{hoveredBar.count} scans</span>
                  </div>
                )}
              </div>

              {/* Responsive SVG Chart */}
              <div className="h-44 w-full flex items-end space-x-3 pt-6 pb-2 px-2">
                {(() => {
                  const timeline = analytics.timeline || [];
                  const maxCount = Math.max(...timeline.map((d) => d.count), 1);
                  return timeline.map((day) => {
                    const heightPercent = Math.max((day.count / maxCount) * 100, 4);
                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                        onMouseEnter={() => setHoveredBar(day)}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        <div className="w-full relative flex justify-center">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full max-w-[36px] bg-indigo-500/80 dark:bg-indigo-400 rounded-t-lg group-hover:bg-indigo-600 dark:group-hover:bg-indigo-300 transition-all duration-200 min-h-[6px]"
                          />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 mt-2 truncate w-full text-center">
                          {day.date.slice(5)}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Breakdowns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Device Breakdown */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2.5">
                <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Device Types</span>
                </div>
                <div className="space-y-2">
                  {(analytics.devices || []).map((d) => (
                    <div key={d.name} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-600 dark:text-zinc-400">{d.name}</span>
                        <span className="font-mono text-zinc-900 dark:text-white font-medium">{d.percentage}% ({d.count})</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div style={{ width: `${d.percentage}%` }} className="h-full bg-zinc-900 dark:bg-white rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operating System */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2.5">
                <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center space-x-1.5">
                  <Laptop className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Operating Systems</span>
                </div>
                <div className="space-y-2">
                  {(analytics.operatingSystems || []).map((os) => (
                    <div key={os.name} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-600 dark:text-zinc-400">{os.name}</span>
                        <span className="font-mono text-zinc-900 dark:text-white font-medium">{os.percentage}% ({os.count})</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div style={{ width: `${os.percentage}%` }} className="h-full bg-emerald-500 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Browsers */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2.5">
                <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Browsers</span>
                </div>
                <div className="space-y-2">
                  {(analytics.browsers || []).map((b) => (
                    <div key={b.name} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-600 dark:text-zinc-400">{b.name}</span>
                        <span className="font-mono text-zinc-900 dark:text-white font-medium">{b.percentage}% ({b.count})</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div style={{ width: `${b.percentage}%` }} className="h-full bg-indigo-500 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Recent Scans Table */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                Live Scan Activity Feed
              </div>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                      <tr>
                        <th className="py-2 px-3">Timestamp (UTC)</th>
                        <th className="py-2 px-3">Device & OS</th>
                        <th className="py-2 px-3">Browser</th>
                        <th className="py-2 px-3">Masked IP</th>
                        <th className="py-2 px-3">Channel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono text-[11px]">
                      {(analytics.recentScans || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-400 font-sans text-xs">
                            No scans logged yet. Scan the code with your phone or click "Simulate Scan" above.
                          </td>
                        </tr>
                      ) : (
                        analytics.recentScans.map((s) => (
                          <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400">
                              {new Date(s.scanned_at).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-zinc-900 dark:text-zinc-100">
                              {s.device_type} / {s.os}
                            </td>
                            <td className="py-2 px-3 text-zinc-600 dark:text-zinc-300">
                              {s.browser}
                            </td>
                            <td className="py-2 px-3 text-zinc-400">
                              {s.ip}
                            </td>
                            <td className="py-2 px-3 text-zinc-500 font-sans">
                              {s.referrer}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </>
        )}

      </div>
    </div>
  );
}
