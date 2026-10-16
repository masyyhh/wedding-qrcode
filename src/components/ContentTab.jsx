import React, { useState } from 'react';
import { Link, AlignLeft, Image, Wifi, Contact, Mail, Sparkles, Upload } from 'lucide-react';

export default function ContentTab({
  contentType,
  setContentType,
  contentData,
  setContentData,
  isTracking,
  setIsTracking,
  title,
  setTitle,
  onSaveTrackedQR,
  isSaving,
  token
}) {
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const types = [
    { id: 'url', label: 'URL', icon: Link },
    { id: 'text', label: 'Text', icon: AlignLeft },
    { id: 'image', label: 'Image', icon: Image },
    { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
    { id: 'vcard', label: 'vCard', icon: Contact },
    { id: 'email', label: 'Email', icon: Mail }
  ];

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!token) {
      setUploadStatus({ type: 'error', message: 'Please sign in to upload assets to your cloud.' });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setContentData({ ...contentData, url: data.imageUrl });
      setUploadStatus({ type: 'success', message: `Uploaded! Image storage: ${data.storage}` });
    } catch (err) {
      setUploadStatus({ type: 'error', message: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Content Type Selector */}
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5">
          Content Type
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {types.map((t) => {
            const Icon = t.icon;
            const active = contentType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setContentType(t.id)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex flex-col items-center justify-center space-y-1 transition ${
                  active
                    ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-950'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Tracking Toggle */}
      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Dynamic Tracking & Real-Time Analytics
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              RECOMMENDED
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Log scans, view scanner devices, and change your destination URL at any time without reprinting.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer ml-4">
          <input
            type="checkbox"
            checked={isTracking}
            onChange={(e) => setIsTracking(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-zinc-950"></div>
        </label>
      </div>

      {/* Campaign / Title */}
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
          QR Code Title / Campaign Name
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Wedding Welcome Board, Reception Table #4"
          className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
        />
      </div>

      {/* Type Specific Inputs */}
      {contentType === 'url' && (
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            Destination URL
          </label>
          <input
            type="url"
            value={contentData.url || ''}
            onChange={(e) => setContentData({ ...contentData, url: e.target.value })}
            placeholder="https://example.com/invitation"
            className="w-full px-3.5 py-2.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
          />
        </div>
      )}

      {contentType === 'text' && (
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            Plain Text Message
          </label>
          <textarea
            rows={3}
            value={contentData.text || ''}
            onChange={(e) => setContentData({ ...contentData, text: e.target.value })}
            placeholder="Welcome to our celebration! Please find your seat at Table 4."
            className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
          />
        </div>
      )}

      {contentType === 'image' && (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Image or Document Asset
          </label>
          <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-2xl p-6 text-center transition cursor-pointer relative bg-zinc-50/50 dark:bg-zinc-800/30">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center space-y-2 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {isUploading ? 'Uploading file...' : 'Drop your photo, menu, or wedding itinerary here'}
              </div>
              <div className="text-[11px] text-zinc-400">PNG, JPG, WebP, PDF up to 15MB</div>
            </div>
          </div>
          {uploadStatus && (
            <div
              className={`text-xs py-2 px-3 rounded-xl border ${
                uploadStatus.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-500 border-red-500/20'
              }`}
            >
              {uploadStatus.message}
            </div>
          )}
          {contentData.url && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 uppercase mb-1">
                Asset Link
              </label>
              <input
                type="text"
                readOnly
                value={contentData.url}
                className="w-full px-3 py-1.5 text-xs font-mono bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400"
              />
            </div>
          )}
        </div>
      )}

      {contentType === 'wifi' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Network Name (SSID)
            </label>
            <input
              type="text"
              value={contentData.wifiSsid || ''}
              onChange={(e) => setContentData({ ...contentData, wifiSsid: e.target.value })}
              placeholder="e.g. Wedding_Guest_Wifi"
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="text"
              value={contentData.wifiPassword || ''}
              onChange={(e) => setContentData({ ...contentData, wifiPassword: e.target.value })}
              placeholder="Leave blank if open"
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Encryption
            </label>
            <select
              value={contentData.wifiEncryption || 'WPA'}
              onChange={(e) => setContentData({ ...contentData, wifiEncryption: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
            >
              <option value="WPA">WPA / WPA2 / WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">None (Open Network)</option>
            </select>
          </div>
        </div>
      )}

      {contentType === 'vcard' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Full Name / Couple
            </label>
            <input
              type="text"
              value={contentData.vcardFn || ''}
              onChange={(e) => setContentData({ ...contentData, vcardFn: e.target.value })}
              placeholder="Sarah & James"
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={contentData.vcardPhone || ''}
              onChange={(e) => setContentData({ ...contentData, vcardPhone: e.target.value })}
              placeholder="+1 (555) 019-2834"
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={contentData.vcardEmail || ''}
              onChange={(e) => setContentData({ ...contentData, vcardEmail: e.target.value })}
              placeholder="concierge@event.com"
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
            />
          </div>
        </div>
      )}

      {contentType === 'email' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Send Email To
            </label>
            <input
              type="email"
              value={contentData.emailTo || ''}
              onChange={(e) => setContentData({ ...contentData, emailTo: e.target.value })}
              placeholder="rsvp@ourwedding.com"
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Email Subject
            </label>
            <input
              type="text"
              value={contentData.emailSubject || ''}
              onChange={(e) => setContentData({ ...contentData, emailSubject: e.target.value })}
              placeholder="RSVP Confirmation"
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition"
            />
          </div>
        </div>
      )}

      {/* Save / Update QR Code Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onSaveTrackedQR}
          disabled={isSaving}
          className="w-full py-3 px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-60"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isSaving ? 'Registering Dynamic QR...' : 'Save & Update Dynamic QR Code'}</span>
        </button>
      </div>

    </div>
  );
}
