import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { Download, Copy } from 'lucide-react';

export default function PreviewDock({
  qrData,
  styling,
  logo,
  errorCorrection,
  contentType,
  isTracking,
  title,
  onShowToast
}) {
  const containerRef = useRef(null);
  const qrCodeInstanceRef = useRef(null);
  const [format, setFormat] = useState('png');
  const [resolution, setResolution] = useState(1000);
  const [isDownloading, setIsDownloading] = useState(false);

  // Initialize or update QR Code Styling
  useEffect(() => {
    const dotsOptions = {
      color: styling.fgColor,
      type: styling.dotStyle
    };

    if (styling.isGradient) {
      dotsOptions.gradient = {
        type: styling.gradientType,
        colorStops: [
          { offset: 0, color: styling.fgColor },
          { offset: 1, color: styling.gradientColor }
        ]
      };
    }

    const options = {
      width: 280,
      height: 280,
      type: 'canvas',
      data: qrData || 'https://qrpatterns.site',
      image: logo.dataUrl || '',
      dotsOptions,
      cornersSquareOptions: {
        color: styling.fgColor,
        type: styling.cornerSquareStyle
      },
      cornersDotOptions: {
        color: styling.fgColor,
        type: styling.cornerDotStyle
      },
      backgroundOptions: {
        color: styling.isTransparent ? 'transparent' : styling.bgColor
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 6,
        imageSize: 0.35,
        hideBackgroundDots: true
      },
      qrOptions: {
        errorCorrectionLevel: errorCorrection
      }
    };

    if (!qrCodeInstanceRef.current) {
      qrCodeInstanceRef.current = new QRCodeStyling(options);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        qrCodeInstanceRef.current.append(containerRef.current);
      }
    } else {
      qrCodeInstanceRef.current.update(options);
    }
  }, [qrData, styling, logo, errorCorrection]);

  const handleDownload = async () => {
    if (!qrCodeInstanceRef.current) return;
    setIsDownloading(true);

    const cleanFileName = (title || 'qr_pattern')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '_');

    try {
      // Temporarily update resolution for high-res download
      qrCodeInstanceRef.current.update({ width: resolution, height: resolution });
      await qrCodeInstanceRef.current.download({ name: cleanFileName, extension: format });
      // Restore preview size
      qrCodeInstanceRef.current.update({ width: 280, height: 280 });
      onShowToast(`Downloaded ${cleanFileName}.${format}`, 'download');
    } catch (err) {
      console.error('Download error:', err);
      onShowToast('Could not download QR code.', 'alert-triangle');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyClipboard = async () => {
    if (!qrCodeInstanceRef.current) return;
    try {
      const blob = await qrCodeInstanceRef.current.getRawData('png');
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      onShowToast('QR code copied to clipboard!', 'clipboard');
    } catch (err) {
      console.error('Clipboard copy error:', err);
      onShowToast('Clipboard copy unsupported in this browser.', 'alert-triangle');
    }
  };

  return (
    <div className="sticky top-24 space-y-4">
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-sm flex flex-col items-center">
        
        {/* Live Preview Header */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/80 mb-5">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Live Preview
            </span>
          </div>
          <div className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {contentType.toUpperCase()} / {isTracking ? 'Dynamic' : 'Static'}
          </div>
        </div>

        {/* Canvas Mount Container */}
        <div className="w-full bg-grid-pattern p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-center transition-all">
          <div
            ref={containerRef}
            className="bg-white p-3 rounded-2xl shadow-sm transition-transform duration-200"
          />
        </div>

        {/* Target URL Preview */}
        <div className="w-full mt-4 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-center">
          <div className="text-[10px] uppercase font-medium tracking-wider text-zinc-400 mb-0.5">
            QR Target Destination
          </div>
          <div className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 truncate">
            {qrData || 'https://qrpatterns.site'}
          </div>
        </div>

        {/* Export Formats & Resolution Dock */}
        <div className="w-full mt-4 space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 uppercase mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-200"
              >
                <option value="png">PNG (Standard)</option>
                <option value="svg">SVG (Vector)</option>
                <option value="webp">WebP (Optimized)</option>
                <option value="jpeg">JPEG</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 uppercase mb-1">
                Resolution
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-200"
              >
                <option value={1000}>HD 1000 × 1000</option>
                <option value={2000}>Ultra 2000 × 2000</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-sm transition flex items-center justify-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Preparing...' : 'Download QR Code'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyClipboard}
              title="Copy QR image to clipboard"
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
