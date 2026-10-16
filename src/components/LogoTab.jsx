import React from 'react';
import { Heart, Wifi, Globe, Phone, Mail, Upload, Trash2 } from 'lucide-react';

export default function LogoTab({
  logo,
  setLogo,
  errorCorrection,
  setErrorCorrection
}) {
  const presets = [
    { id: '', label: 'None' },
    { id: 'heart', label: 'Heart', icon: Heart, color: 'text-pink-500' },
    { id: 'wifi', label: 'Wi-Fi', icon: Wifi, color: 'text-blue-500' },
    { id: 'globe', label: 'Globe', icon: Globe, color: 'text-zinc-700 dark:text-zinc-300' },
    { id: 'phone', label: 'Phone', icon: Phone, color: 'text-emerald-500' },
    { id: 'mail', label: 'Mail', icon: Mail, color: 'text-purple-500' }
  ];

  const handleCustomLogoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setLogo({
        type: 'custom',
        dataUrl: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePresetClick = (presetId) => {
    if (!presetId) {
      setLogo({ type: 'none', dataUrl: '' });
      return;
    }

    let svgStr = '';
    if (presetId === 'heart') {
      svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="#e11d48" stroke="#e11d48" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
    } else if (presetId === 'wifi') {
      svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/></svg>`;
    } else if (presetId === 'globe') {
      svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#09090b" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
    } else if (presetId === 'phone') {
      svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
    } else if (presetId === 'mail') {
      svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9333ea" stroke-width="2.5"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
    }

    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    setLogo({
      type: presetId,
      dataUrl
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Preset Center Icons */}
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
          Preset Center Icons
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {presets.map((p) => {
            const Icon = p.icon;
            const active = logo.type === (p.id || 'none');
            return (
              <button
                key={p.id || 'none'}
                type="button"
                onClick={() => handlePresetClick(p.id)}
                className={`py-2 px-2 text-xs border rounded-xl transition flex flex-col items-center justify-center space-y-1 ${
                  active
                    ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {Icon ? <Icon className={`w-4 h-4 ${p.color}`} /> : <span className="text-zinc-400">∅</span>}
                <span className="text-[11px]">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Center Logo Upload */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Custom Center Logo
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleCustomLogoFile}
            className="flex-1 text-xs text-zinc-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-800 dark:file:text-zinc-200 hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700 cursor-pointer"
          />
          {logo.dataUrl && (
            <button
              type="button"
              onClick={() => setLogo({ type: 'none', dataUrl: '' })}
              title="Remove center logo"
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error Correction Level */}
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
          Error Correction Level
        </label>
        <select
          value={errorCorrection}
          onChange={(e) => setErrorCorrection(e.target.value)}
          className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl"
        >
          <option value="L">Low (7% recovery) — Cleanest dense pattern</option>
          <option value="M">Medium (15% recovery) — Standard recommendation</option>
          <option value="Q">Quartile (25% recovery) — Best with center logos</option>
          <option value="H">High (30% recovery) — Maximum durability for print</option>
        </select>
        <p className="mt-1 text-[11px] text-zinc-400">
          Higher recovery levels enable scanning even if a portion of the QR code is obscured by logos or smudged.
        </p>
      </div>

    </div>
  );
}
