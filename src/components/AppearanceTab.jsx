import React from 'react';

export default function AppearanceTab({
  styling,
  setStyling
}) {
  const palettes = [
    { name: 'Obsidian Noir', fg: '#09090b', bg: '#ffffff', dotClass: 'bg-zinc-950' },
    { name: 'Forest Pine', fg: '#064e3b', bg: '#f0fdf4', dotClass: 'bg-emerald-900' },
    { name: 'Royal Navy', fg: '#1e3a8a', bg: '#eff6ff', dotClass: 'bg-blue-900' },
    { name: 'Velvet Berry', fg: '#831843', bg: '#fdf2f8', dotClass: 'bg-pink-900' }
  ];

  const handleApplyPalette = (fg, bg) => {
    setStyling({
      ...styling,
      fgColor: fg,
      bgColor: bg,
      isTransparent: false,
      isGradient: false
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Curated Palettes */}
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5">
          Curated Color Palettes
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {palettes.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => handleApplyPalette(p.fg, p.bg)}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-left transition flex items-center space-x-2.5"
            >
              <div className={`w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-700 ${p.dotClass}`} />
              <span className="text-xs font-medium">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Foreground & Background Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            Foreground Color
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={styling.fgColor}
              onChange={(e) => setStyling({ ...styling, fgColor: e.target.value })}
              className="w-10 h-10 p-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={styling.fgColor}
              onChange={(e) => setStyling({ ...styling, fgColor: e.target.value })}
              className="flex-1 px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            Background Color
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={styling.bgColor}
              disabled={styling.isTransparent}
              onChange={(e) => setStyling({ ...styling, bgColor: e.target.value })}
              className="w-10 h-10 p-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent cursor-pointer disabled:opacity-40"
            />
            <input
              type="text"
              value={styling.isTransparent ? 'Transparent' : styling.bgColor}
              disabled={styling.isTransparent}
              onChange={(e) => setStyling({ ...styling, bgColor: e.target.value })}
              className="flex-1 px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      {/* Transparent Background Option */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Transparent Background</div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Perfect for PNG overlays on invitations & menus</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={styling.isTransparent}
            onChange={(e) => setStyling({ ...styling, isTransparent: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-zinc-950"></div>
        </label>
      </div>

      {/* Color Gradient Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Dual Color Gradient</div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Blends two elegant tones across the QR modules</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={styling.isGradient}
              onChange={(e) => setStyling({ ...styling, isGradient: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-zinc-950"></div>
          </label>
        </div>

        {styling.isGradient && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Secondary Gradient Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={styling.gradientColor}
                  onChange={(e) => setStyling({ ...styling, gradientColor: e.target.value })}
                  className="w-10 h-10 p-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={styling.gradientColor}
                  onChange={(e) => setStyling({ ...styling, gradientColor: e.target.value })}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Gradient Type
              </label>
              <select
                value={styling.gradientType}
                onChange={(e) => setStyling({ ...styling, gradientType: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl"
              >
                <option value="linear">Linear (Diagonal)</option>
                <option value="radial">Radial (From Center)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Pattern Geometry Styles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            Module Pattern
          </label>
          <select
            value={styling.dotStyle}
            onChange={(e) => setStyling({ ...styling, dotStyle: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl"
          >
            <option value="rounded">Rounded (Clean)</option>
            <option value="dots">Modern Dots</option>
            <option value="classy">Classy</option>
            <option value="classy-rounded">Classy-Rounded</option>
            <option value="square">Classic Square</option>
            <option value="extra-rounded">Extra-Rounded</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            Corner Squares
          </label>
          <select
            value={styling.cornerSquareStyle}
            onChange={(e) => setStyling({ ...styling, cornerSquareStyle: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl"
          >
            <option value="extra-rounded">Extra-Rounded</option>
            <option value="dot">Circle</option>
            <option value="square">Square</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            Corner Dots
          </label>
          <select
            value={styling.cornerDotStyle}
            onChange={(e) => setStyling({ ...styling, cornerDotStyle: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl"
          >
            <option value="dot">Dot / Circle</option>
            <option value="square">Square</option>
          </select>
        </div>
      </div>

    </div>
  );
}
