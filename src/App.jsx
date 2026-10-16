import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ContentTab from './components/ContentTab';
import AppearanceTab from './components/AppearanceTab';
import LogoTab from './components/LogoTab';
import PreviewDock from './components/PreviewDock';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AuthModal from './components/AuthModal';
import AnalyticsModal from './components/AnalyticsModal';
import EditLinkModal from './components/EditLinkModal';
import Toast from './components/Toast';
import { Sparkles, Palette, Image as ImageIcon, Link as LinkIcon, ShieldCheck, Zap, Activity } from 'lucide-react';

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('qr_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('qr_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('qr_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // Authentication & User State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('qr_jwt') || null);

  // Active creator tab
  const [activeTab, setActiveTab] = useState('content'); // 'content' | 'appearance' | 'logo'

  // Content state
  const [contentType, setContentType] = useState('url');
  const [contentData, setContentData] = useState({
    url: 'https://qrpatterns.site',
    text: '',
    wifiSsid: '',
    wifiPassword: '',
    wifiEncryption: 'WPA',
    vcardFn: '',
    vcardPhone: '',
    vcardEmail: '',
    emailTo: '',
    emailSubject: ''
  });
  const [isTracking, setIsTracking] = useState(true);
  const [title, setTitle] = useState('Wedding Welcome & RSVP');
  const [registeredShortUrl, setRegisteredShortUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Styling state
  const [styling, setStyling] = useState({
    fgColor: '#09090b',
    bgColor: '#ffffff',
    isTransparent: false,
    isGradient: false,
    gradientColor: '#6366f1',
    gradientType: 'linear',
    dotStyle: 'rounded',
    cornerSquareStyle: 'extra-rounded',
    cornerDotStyle: 'dot'
  });

  // Logo & Error recovery state
  const [logo, setLogo] = useState({ type: 'none', dataUrl: '' });
  const [errorCorrection, setErrorCorrection] = useState('M');

  // Tracked links & Overview Analytics
  const [links, setLinks] = useState([]);
  const [overview, setOverview] = useState({
    totalCodes: 0,
    totalScans: 0,
    todayScans: 0,
    topLink: null
  });

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // { type: 'auth' | 'analytics' | 'edit', ...payload }

  // Toast state
  const [toast, setToast] = useState(null);
  const showToast = (message, icon = 'check-circle') => {
    setToast({ message, icon });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 3800);
  };

  // Check auth session on startup
  useEffect(() => {
    if (!token) return;

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        loadUserLinks(token);
      })
      .catch(() => {
        localStorage.removeItem('qr_jwt');
        setToken(null);
        setUser(null);
      });
  }, [token]);

  // Load user tracked links and overview
  const loadUserLinks = async (authToken = token) => {
    if (!authToken) return;
    try {
      const [linksRes, overviewRes] = await Promise.all([
        fetch('/api/links', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/analytics/overview', { headers: { Authorization: `Bearer ${authToken}` } })
      ]);

      if (linksRes.ok) {
        const linksData = await linksRes.json();
        setLinks(linksData.links || []);
      }
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setOverview(overviewData);
      }
    } catch (err) {
      console.error('Failed to load user links:', err);
    }
  };

  // Auth success callback
  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem('qr_jwt', newToken);
    setToken(newToken);
    setUser(newUser);
    loadUserLinks(newToken);
  };

  // Logout callback
  const handleLogout = () => {
    localStorage.removeItem('qr_jwt');
    setToken(null);
    setUser(null);
    setLinks([]);
    setOverview({ totalCodes: 0, totalScans: 0, todayScans: 0, topLink: null });
    showToast('Signed out successfully.', 'log-out');
  };

  // Compute Raw QR Destination
  const computeRawData = () => {
    if (isTracking && registeredShortUrl) {
      return registeredShortUrl;
    }

    switch (contentType) {
      case 'url':
        return contentData.url || 'https://qrpatterns.site';
      case 'text':
        return contentData.text || 'Welcome to QR Patterns';
      case 'image':
        return contentData.url || 'https://qrpatterns.site';
      case 'wifi':
        return `WIFI:S:${contentData.wifiSsid || 'Network'};T:${contentData.wifiEncryption || 'WPA'};P:${contentData.wifiPassword || ''};;`;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${contentData.vcardFn || 'Guest'}\nTEL:${contentData.vcardPhone || ''}\nEMAIL:${contentData.vcardEmail || ''}\nEND:VCARD`;
      case 'email':
        return `mailto:${contentData.emailTo || 'contact@example.com'}?subject=${encodeURIComponent(contentData.emailSubject || '')}`;
      default:
        return 'https://qrpatterns.site';
    }
  };

  const rawQRData = computeRawData();

  // Save / Register dynamic QR code with backend
  const handleSaveTrackedQR = async () => {
    if (!token) {
      showToast('Please sign in or create an account to save dynamic QR codes.', 'alert-triangle');
      setActiveModal({ type: 'auth', initialMode: 'signup' });
      return;
    }

    const targetUrl = computeRawData();
    if (!targetUrl || targetUrl === 'https://qrpatterns.site' && contentType === 'url' && !contentData.url) {
      showToast('Please enter your destination URL or content first.', 'alert-triangle');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          originalUrl: targetUrl,
          title: title || 'Dynamic QR Campaign',
          contentType,
          styling
        })
      });

      const contentTypeHeader = res.headers.get('content-type') || '';
      let data = {};
      if (contentTypeHeader.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || 'Server returned an invalid response.');
      }

      if (!res.ok) throw new Error(data.error || 'Failed to save dynamic QR code');

      setRegisteredShortUrl(data.shortUrl);
      showToast('Dynamic QR code registered! Live tracking is active.', 'check-circle');
      loadUserLinks(token);
    } catch (err) {
      console.error('Error saving dynamic QR:', err);
      showToast(err.message, 'alert-triangle');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete tracked QR link
  const handleDeleteLink = async (shortId) => {
    if (!window.confirm('Are you sure you want to delete this tracked QR code? Historical analytics will be purged.')) {
      return;
    }

    try {
      const res = await fetch(`/api/links/${shortId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete link');

      showToast('Tracked link deleted.', 'check-circle');
      if (registeredShortUrl && registeredShortUrl.includes(shortId)) {
        setRegisteredShortUrl(null);
      }
      loadUserLinks(token);
    } catch (err) {
      showToast(err.message, 'alert-triangle');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased flex flex-col font-sans transition-colors duration-200">
      
      {/* Navigation Bar */}
      <Navbar
        user={user}
        trackedCount={links.length}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenAuth={(mode) => setActiveModal({ type: 'auth', initialMode: mode })}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Hero Section */}
        <div className="max-w-3xl mb-10 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Modern Minimalist QR Studio • Real-Time Scan Telemetry</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.15]">
            Design Beautiful, Dynamic QR Codes.
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Generate high-resolution vector and raster QR patterns with real-time scan analytics, dynamic URL redirection, and zero third-party telemetry.
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Private & Secure</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Instant SVG / PNG Export</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-indigo-500" />
              <span>Scan Analytics & Device Metrics</span>
            </span>
          </div>
        </div>

        {/* Creator Section */}
        <section id="creator-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Creator Controls & Tabs (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 sm:p-7 shadow-sm space-y-6">
            
            {/* Tab Navigation Pill Bar */}
            <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                  activeTab === 'content'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>1. Content</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('appearance')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                  activeTab === 'appearance'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>2. Appearance</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('logo')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                  activeTab === 'logo'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>3. Logo & Recovery</span>
              </button>
            </div>

            {/* Active Tab Component */}
            {activeTab === 'content' && (
              <ContentTab
                contentType={contentType}
                setContentType={setContentType}
                contentData={contentData}
                setContentData={setContentData}
                isTracking={isTracking}
                setIsTracking={setIsTracking}
                title={title}
                setTitle={setTitle}
                onSaveTrackedQR={handleSaveTrackedQR}
                isSaving={isSaving}
                token={token}
              />
            )}

            {activeTab === 'appearance' && (
              <AppearanceTab
                styling={styling}
                setStyling={setStyling}
              />
            )}

            {activeTab === 'logo' && (
              <LogoTab
                logo={logo}
                setLogo={setLogo}
                errorCorrection={errorCorrection}
                setErrorCorrection={setErrorCorrection}
              />
            )}

          </div>

          {/* Right Column: Sticky Preview Dock (5 cols) */}
          <div className="lg:col-span-5">
            <PreviewDock
              qrData={rawQRData}
              styling={styling}
              logo={logo}
              errorCorrection={errorCorrection}
              contentType={contentType}
              isTracking={isTracking}
              title={title}
              onShowToast={showToast}
            />
          </div>

        </section>

        {/* Analytics Hub Section */}
        <AnalyticsDashboard
          user={user}
          overview={overview}
          links={links}
          onOpenAnalyticsModal={(shortId) => setActiveModal({ type: 'analytics', shortId })}
          onOpenEditModal={(link) => setActiveModal({ type: 'edit', link })}
          onDeleteLink={handleDeleteLink}
          onOpenAuth={(mode) => setActiveModal({ type: 'auth', initialMode: mode })}
          onShowToast={showToast}
        />

      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-zinc-200/80 dark:border-zinc-800/80 py-8 bg-white/40 dark:bg-zinc-950/40 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">QR Patterns</span>
            <span>•</span>
            <span>Zero telemetry tracking</span>
            <span>•</span>
            <span>Enterprise-grade privacy</span>
          </div>
          <div>
            Built with React, Vite & Node.js • Hosted securely at <span className="font-mono text-zinc-700 dark:text-zinc-300">qrpatterns.site</span>
          </div>
        </div>
      </footer>

      {/* Modals Container */}
      {activeModal?.type === 'auth' && (
        <AuthModal
          isOpen={true}
          initialMode={activeModal.initialMode || 'login'}
          onClose={() => setActiveModal(null)}
          onSuccess={handleAuthSuccess}
          onShowToast={showToast}
        />
      )}

      {activeModal?.type === 'analytics' && (
        <AnalyticsModal
          shortId={activeModal.shortId}
          token={token}
          onClose={() => setActiveModal(null)}
          onShowToast={showToast}
        />
      )}

      {activeModal?.type === 'edit' && (
        <EditLinkModal
          link={activeModal.link}
          token={token}
          onClose={() => setActiveModal(null)}
          onUpdated={() => loadUserLinks(token)}
          onShowToast={showToast}
        />
      )}

      {/* Toast Notification */}
      <Toast toast={toast} />

    </div>
  );
}
