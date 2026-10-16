// Modern Minimalist QR Studio & Analytics Server
// Production-Hardened for Public Internet Hosting
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('node:crypto');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const db = require('./db');

const app = express();
const port = parseInt(process.env.PORT || '5001', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Helper to determine canonical public URL (handles reverse proxy like Caddy)
function getBaseUrl(req) {
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL.replace(/\/+$/, '');
  }
  return `${req.protocol}://${req.get('host')}`;
}

// Trust reverse proxy (necessary when hosting behind Caddy, Nginx, Cloudflare, etc.)
app.set('trust proxy', 1);

// Hide server branding
app.disable('x-powered-by');

// --- Cloudinary Setup ---
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('☁️  Cloudinary storage: Active');
} else {
  console.log('📁 Local image storage: Active (Cloudinary credentials not provided)');
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// --- Security Middleware ---

// 1. Helmet Security Headers with Tuned Content Security Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.tailwindcss.com",
        "https://unpkg.com",
        "https://cdn.jsdelivr.net"
      ],
      scriptSrcAttr: [
        "'unsafe-inline'"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:"
      ],
      connectSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com"
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  },
  crossOriginEmbedderPolicy: false
}));

// 2. CORS Policy (supports apex, www, localhost, and custom origin headers)
app.use(cors({
  origin: (origin, callback) => {
    // Requests with no origin (e.g. mobile apps, curl, or standard same-origin navigation)
    if (!origin) return callback(null, true);

    if (process.env.CORS_ORIGIN === '*') return callback(null, true);

    if (process.env.CORS_ORIGIN) {
      const allowed = process.env.CORS_ORIGIN.split(',').map(s => s.trim());
      if (allowed.includes(origin)) return callback(null, true);
    }

    if (process.env.CLIENT_URL) {
      const clientUrl = process.env.CLIENT_URL.replace(/\/+$/, '');
      try {
        const u = new URL(clientUrl);
        const apex = u.hostname.replace(/^www\./, '');
        const originUrl = new URL(origin);
        const originHost = originUrl.hostname.replace(/^www\./, '');

        if (originHost === apex || originHost === 'localhost' || originHost === '127.0.0.1') {
          return callback(null, true);
        }
      } catch {
        if (origin === clientUrl) return callback(null, true);
      }
    }

    // Default: allow all origins in web app
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
}));

// 3. Body Parsing with Safe Limits (prevents memory exhaustion)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
const clientBuildDir = fs.existsSync(path.join(__dirname, 'dist'))
  ? path.join(__dirname, 'dist')
  : path.join(__dirname, 'public');
app.use(express.static(clientBuildDir));

// 4. Rate Limiting Suite

// Auth Limiter: Strictest limit to stop brute-force & credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' }
});

// General API Limiter: Prevents general API abuse
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 180, // 180 requests per min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'API rate limit exceeded. Please slow down.' }
});

// Link Creation Limiter: Prevents QR link spamming
const linkCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40, // 40 links per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'QR generation limit reached. Please wait a few minutes before creating more.' }
});

// Public Redirect Limiter: Protects redirect route from DoS while letting real guests through
const redirectLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 400, // 400 scans per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Traffic limit reached. Please try scanning again shortly.'
});

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    // Only allow images and PDFs
    const allowedMime = /^image\/(png|jpe?g|webp|svg\+xml|gif)$|^application\/pdf$/;
    if (allowedMime.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, WebP, SVG, and PDF files are allowed.'));
    }
  }
});

// --- Security & Cryptography Helpers ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
  try {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateShortId(length = 7) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

// URL Sanitization & SSRF Defense
function sanitizeAndValidateUrl(inputUrl = '') {
  const raw = String(inputUrl).trim();
  if (!raw) return { valid: false, error: 'URL cannot be empty.' };

  // Disallow dangerous schemes
  if (/^(javascript:|data:|vbscript:|file:)/i.test(raw)) {
    return { valid: false, error: 'Invalid or prohibited URL protocol.' };
  }

  // Handle standard non-HTTP schemes (mailto, tel, sms, wifi, vcard)
  if (/^(mailto:|tel:|sms:|wifi:|begin:vcard)/i.test(raw)) {
    return { valid: true, url: raw };
  }

  // Ensure HTTP/HTTPS
  let finalUrl = raw;
  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = 'https://' + finalUrl;
  }

  try {
    const parsed = new URL(finalUrl);
    const hostname = parsed.hostname.toLowerCase();

    // Prevent loopback and private IP redirects in production to avoid SSRF
    if (isProduction) {
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname === '169.254.169.254'
      ) {
        return { valid: false, error: 'Private or local IP destinations are prohibited.' };
      }
    }

    return { valid: true, url: parsed.toString() };
  } catch {
    return { valid: false, error: 'Please enter a valid, well-formed URL.' };
  }
}

function parseUserAgent(rawUa = '') {
  // Cap length to 500 characters to prevent ReDoS / CPU abuse
  const ua = String(rawUa || '').slice(0, 500);

  let deviceType = 'Desktop';
  if (/mobile|iphone|ipod|android.*mobile|blackberry|phone|opera mini|iemobile/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (/ipad|tablet|android(?!.*mobile)|kindle|silk/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/bot|crawler|spider|curl|wget|postman/i.test(ua)) {
    deviceType = 'Bot';
  }

  let os = 'Other';
  if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS';
  else if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/cros/i.test(ua)) os = 'ChromeOS';

  let browser = 'Other';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';

  return { deviceType, os, browser };
}

function getClientIp(req) {
  let ip = '127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    ip = forwarded.split(',')[0].trim();
  } else if (req.socket?.remoteAddress) {
    ip = req.socket.remoteAddress;
  }
  // Strip IPv4-mapped IPv6 prefix (e.g., ::ffff:192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }
  return ip;
}

function anonymizeIp(ip = '') {
  if (!ip) return 'Unknown';
  let cleanIp = String(ip).trim();
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.slice(7);
  }
  if (cleanIp.includes('.')) {
    const parts = cleanIp.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  }
  if (cleanIp.includes(':')) {
    const parts = cleanIp.split(':');
    return `${parts.slice(0, 3).join(':')}:*:*`;
  }
  return cleanIp;
}

// --- Authentication Middleware ---
async function authRequired(req, res, next) {
  let token = null;

  // Check Bearer Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.cookies && req.cookies.qr_session) {
    // Check secure HttpOnly cookie fallback
    token = req.cookies.qr_session;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  try {
    const session = await db.findSession(token);
    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }

    req.user = { id: session.id, email: session.email, name: session.name };
    req.token = token;
    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    res.status(500).json({ error: 'Authentication service error.' });
  }
}

// --- Health Check Endpoint (For monitoring & deployment platforms) ---
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await db.healthCheck();
    res.json({
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        engine: db.dbEngine,
        connected: dbHealthy
      },
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
      }
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// Apply general API rate limiter to all API endpoints
app.use('/api', apiLimiter);

// --- Auth Endpoints ---

// 1. User Sign Up (Rate Limited)
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters for security.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanName = (name && String(name).trim().slice(0, 100)) || cleanEmail.split('@')[0];

  try {
    const existing = await db.findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const { salt, hash } = hashPassword(password);
    const user = await db.createUser({
      email: cleanEmail,
      name: cleanName,
      passwordHash: hash,
      salt
    });

    // Generate 30-day session token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.createSession({ token, userId: user.id, expiresAt });

    // Set secure cookie
    res.cookie('qr_session', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Sign up error:', err);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

// 2. User Log In (Rate Limited)
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter your email and password.' });
  }

  const cleanEmail = String(email).toLowerCase().trim();

  try {
    const user = await db.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = verifyPassword(String(password), user.salt, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.createSession({ token, userId: user.id, expiresAt });

    res.cookie('qr_session', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// 3. User Log Out
app.post('/api/auth/logout', async (req, res) => {
  const token = req.cookies?.qr_session || (req.headers.authorization && req.headers.authorization.slice(7).trim());
  if (token) {
    try {
      await db.deleteSession(token);
    } catch {
      // ignore
    }
  }
  res.clearCookie('qr_session', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/'
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// 4. Current User Session Check
app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

// --- QR & Analytics API Endpoints ---

// 5. Image & Asset Upload
app.post('/upload-image', authRequired, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }

  // Cloudinary storage if configured
  if (hasCloudinary) {
    try {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'qr-codes', resource_type: 'auto' },
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      return res.json({ imageUrl: uploadResult.secure_url, storage: 'cloudinary' });
    } catch (err) {
      console.warn('Cloudinary upload error, using local fallback:', err.message);
    }
  }

  // Local storage fallback
  try {
    const ext = path.extname(req.file.originalname) || '.png';
    const filename = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, req.file.buffer);

    const protocol = req.protocol;
    const host = req.get('host');
    const localUrl = `${protocol}://${host}/uploads/${filename}`;
    return res.json({ imageUrl: localUrl, storage: 'local' });
  } catch (error) {
    console.error('Local upload error:', error);
    return res.status(500).json({ error: 'Could not store image locally.' });
  }
});

// 6. Create / Shorten Trackable Link
app.post('/api/shorten', authRequired, linkCreationLimiter, async (req, res) => {
  const { originalUrl, title, contentType } = req.body;

  const validation = sanitizeAndValidateUrl(originalUrl);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const shortId = generateShortId(7);
  const cleanTitle = (title && String(title).trim().slice(0, 120)) || 'Untitled QR Code';
  const type = String(contentType || 'url').slice(0, 32);

  try {
    const link = await db.createLink({
      userId: req.user.id,
      shortId,
      title: cleanTitle,
      originalUrl: validation.url,
      contentType: type
    });

    const baseUrl = getBaseUrl(req);
    const shortUrl = `${baseUrl}/r/${shortId}`;

    res.status(201).json({
      success: true,
      shortId,
      shortUrl,
      title: cleanTitle,
      originalUrl: validation.url,
      contentType: type,
      createdAt: link.created_at
    });
  } catch (err) {
    console.error('Database error creating link:', err);
    res.status(500).json({ error: 'Database error creating trackable link.' });
  }
});

// 7. Get All Tracked Links (Filtered to current authenticated user ONLY)
app.get('/api/links', authRequired, async (req, res) => {
  try {
    const links = await db.getLinksByUser(req.user.id);
    const baseUrl = getBaseUrl(req);
    const enriched = links.map(link => ({
      ...link,
      short_url: `${baseUrl}/r/${link.short_id}`
    }));

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching links:', err);
    res.status(500).json({ error: 'Could not load your tracked links.' });
  }
});

// 8. Update Link Destination or Title
app.patch('/api/links/:shortId', authRequired, async (req, res) => {
  const { shortId } = req.params;
  const { title, originalUrl } = req.body;

  let validatedUrl = undefined;
  if (originalUrl !== undefined) {
    const validation = sanitizeAndValidateUrl(originalUrl);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    validatedUrl = validation.url;
  }

  try {
    const result = await db.updateLink(shortId, req.user.id, {
      title: title ? String(title).trim().slice(0, 120) : undefined,
      originalUrl: validatedUrl
    });

    if (result.notFound) return res.status(404).json({ error: 'Link not found.' });
    if (result.forbidden) return res.status(403).json({ error: 'Forbidden. You do not own this QR code.' });

    res.json({
      success: true,
      message: 'Link updated successfully.',
      link: result.link
    });
  } catch (err) {
    console.error('Error updating link:', err);
    res.status(500).json({ error: 'Could not update link.' });
  }
});

// 9. Delete Link
app.delete('/api/links/:shortId', authRequired, async (req, res) => {
  const { shortId } = req.params;
  try {
    const result = await db.deleteLink(shortId, req.user.id);
    if (result.notFound) return res.status(404).json({ error: 'Link not found.' });
    if (result.forbidden) return res.status(403).json({ error: 'Forbidden. You do not own this QR code.' });

    res.json({ success: true, message: 'QR link deleted.' });
  } catch (err) {
    console.error('Error deleting link:', err);
    res.status(500).json({ error: 'Could not delete link.' });
  }
});

// 10. Deep Analytics for Specific QR Code
app.get('/api/links/:shortId/analytics', authRequired, async (req, res) => {
  const { shortId } = req.params;

  try {
    const analytics = await db.getLinkAnalytics(shortId, req.user.id);
    if (analytics.notFound) return res.status(404).json({ error: 'Tracked link not found.' });
    if (analytics.forbidden) return res.status(403).json({ error: 'Forbidden. You do not have permission to view this QR code’s analytics.' });

    analytics.link.shortUrl = `${getBaseUrl(req)}/r/${analytics.link.short_id}`;

    // Anonymize IP addresses before returning to client for privacy
    analytics.recentScans = analytics.recentScans.map(s => ({
      ...s,
      ip: anonymizeIp(s.ip),
      referrer: s.referrer || 'Direct / Camera Scan'
    }));

    res.json(analytics);
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Could not load analytics.' });
  }
});

// 11. User Analytics Overview
app.get('/api/analytics/overview', authRequired, async (req, res) => {
  try {
    const overview = await db.getUserOverview(req.user.id);
    res.json(overview);
  } catch (err) {
    console.error('Error fetching overview:', err);
    res.status(500).json({ error: 'Could not fetch overview.' });
  }
});

// 12. Export Scans to CSV
app.get('/api/links/:shortId/export-csv', authRequired, async (req, res) => {
  const { shortId } = req.params;

  try {
    const data = await db.getRecentScansForExport(shortId, req.user.id);
    if (!data) {
      return res.status(404).json({ error: 'Link not found or access denied.' });
    }

    // Generate CSV content with Formula Injection Defense (DDE)
    const header = 'Scan ID,Timestamp (UTC),Device Type,Operating System,Browser,Referrer / Channel,Masked IP\n';
    const rows = data.scans.map(s => {
      const escape = (val) => {
        let str = String(val || '');
        // Prefix cells starting with =, +, -, @, \t, or \r with a single quote to prevent spreadsheet execution
        if (/^[=+\-@\t\r]/.test(str)) {
          str = "'" + str;
        }
        return `"${str.replace(/"/g, '""')}"`;
      };
      return [
        s.id,
        escape(new Date(s.scanned_at).toISOString()),
        escape(s.device_type || 'Desktop'),
        escape(s.os || 'Other'),
        escape(s.browser || 'Other'),
        escape(s.referrer || 'Direct / QR Camera'),
        escape(anonymizeIp(s.ip))
      ].join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="qr-scans-${shortId}.csv"`);
    res.send(header + rows);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ error: 'Failed to generate CSV export.' });
  }
});

// 13. Simulate Scan (Testing helper)
app.post('/api/links/:shortId/simulate-scan', authRequired, async (req, res) => {
  const { shortId } = req.params;
  try {
    const link = await db.getLinkByShortId(shortId);
    if (!link) return res.status(404).json({ error: 'Link not found.' });
    if (link.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden. You do not own this QR code.' });

    const mockProfiles = [
      {
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        ip: '172.56.21.89',
        ref: 'QR Camera Scan'
      },
      {
        ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.122 Mobile Safari/537.36',
        ip: '198.51.100.42',
        ref: 'Google Lens'
      },
      {
        ua: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        ip: '192.0.2.11',
        ref: 'Direct'
      },
      {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        ip: '203.0.113.195',
        ref: 'Web Preview'
      }
    ];

    const profile = mockProfiles[Math.floor(Math.random() * mockProfiles.length)];
    const parsed = parseUserAgent(profile.ua);
    const now = new Date().toISOString();

    await db.recordScan({
      shortId,
      scannedAt: now,
      ip: profile.ip,
      userAgent: profile.ua,
      deviceType: parsed.deviceType,
      browser: parsed.browser,
      os: parsed.os,
      referrer: profile.ref
    });

    res.json({
      success: true,
      message: 'Simulated scan recorded successfully.',
      scan: {
        scannedAt: now,
        deviceType: parsed.deviceType,
        os: parsed.os,
        browser: parsed.browser,
        simulatedIp: anonymizeIp(profile.ip)
      }
    });
  } catch (err) {
    console.error('Error simulating scan:', err);
    res.status(500).json({ error: 'Could not record simulated scan.' });
  }
});

// --- Public Redirect Route (/r/:shortId) ---
// Publicly accessible to anyone scanning the physical QR code
app.get('/r/:shortId', redirectLimiter, async (req, res) => {
  const { shortId } = req.params;

  try {
    const link = await db.getLinkByShortId(shortId);

    if (!link) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Not Found — QR Patterns</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-zinc-950 text-zinc-100 min-h-screen flex items-center justify-center p-6">
          <div class="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
            <div class="w-12 h-12 bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-4 font-mono text-xl font-bold">404</div>
            <h1 class="text-2xl font-bold mb-2">QR Code Not Found</h1>
            <p class="text-zinc-400 text-sm mb-6">This dynamic QR link may have expired or was removed by its creator.</p>
            <a href="/" class="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition">Return to QR Patterns</a>
          </div>
        </body>
        </html>
      `);
    }

    // Re-validate target URL to ensure safety (prevents open redirects or SSRF if data was tampered)
    const targetValidation = sanitizeAndValidateUrl(link.original_url);
    if (!targetValidation.valid) {
      return res.status(400).send('Invalid or prohibited destination URL.');
    }
    const target = targetValidation.url;

    // Capture scan metadata with length bounding
    const rawUa = req.get('user-agent') || '';
    const ua = rawUa.slice(0, 500);
    const ip = getClientIp(req);
    const rawRef = req.get('referrer') || req.get('referer') || '';
    const referrer = rawRef.slice(0, 500);
    const { deviceType, os, browser } = parseUserAgent(ua);
    const now = new Date().toISOString();

    // Record scan asynchronously
    db.recordScan({
      shortId,
      scannedAt: now,
      ip,
      userAgent: ua,
      deviceType,
      browser,
      os,
      referrer
    }).catch(err => console.error('Failed to log scan:', err));

    res.redirect(302, target);
  } catch (err) {
    console.error('Error during redirect:', err);
    res.status(500).send('Redirection error.');
  }
});

// Fallback to index.html for frontend routing
app.use((req, res) => {
  res.sendFile(path.join(clientBuildDir, 'index.html'));
});

// Centralized Error Handler (Prevents stack traces leaking in production)
app.use((err, req, res, next) => {
  console.error('Unhandled application error:', err);
  res.status(err.status || 500).json({
    error: isProduction ? 'An unexpected server error occurred.' : err.message
  });
});

// --- Server Startup with Database Initialization ---
async function startServer() {
  try {
    await db.init();

    // Seed demo user if enabled; otherwise purge demo account
    const shouldSeedDemo = process.env.SEED_DEMO !== 'false';
    if (shouldSeedDemo) {
      const demoUser = await db.findUserByEmail('demo@qrstudio.com');
      if (!demoUser) {
        const { salt, hash } = hashPassword('password123');
        await db.createUser({
          email: 'demo@qrstudio.com',
          name: 'Demo Organizer',
          passwordHash: hash,
          salt
        });
        console.log('👤 Seeded demo user: demo@qrstudio.com (password: password123)');
      }
    } else {
      await db.deleteUserByEmail('demo@qrstudio.com');
      console.log('🔒 Demo account disabled & purged (SEED_DEMO=false)');
    }

    const server = app.listen(port, () => {
      console.log(`✨ QR Patterns running at http://localhost:${port}`);
      console.log(`🔒 Security: Helmet, Rate Limiting & SSRF Validation Active`);
      console.log(`💾 Database: ${db.dbEngine.toUpperCase()}`);
    });

    // Graceful Shutdown on SIGTERM and SIGINT
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        console.log('🔌 HTTP server closed.');
        await db.close();
        console.log('💾 Database connection closed.');
        process.exit(0);
      });

      // Force exit if not completed in 10 seconds
      setTimeout(() => {
        console.error('⚠️ Forcefully terminating after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error('❌ Failed to initialize database and start server:', err);
    process.exit(1);
  }
}

startServer();
