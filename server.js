// Modern Minimalist QR Studio & Analytics Server (with User Authentication & Access Control)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const app = express();
const port = process.env.PORT || 3000;

// --- Database Setup (Native SQLite via node:sqlite) ---
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high performance and durability
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Create tables if not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    short_id TEXT NOT NULL UNIQUE,
    title TEXT,
    original_url TEXT NOT NULL,
    content_type TEXT DEFAULT 'url',
    scan_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    last_scanned_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_id TEXT NOT NULL,
    scanned_at TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    referrer TEXT,
    FOREIGN KEY(short_id) REFERENCES links(short_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
  CREATE INDEX IF NOT EXISTS idx_links_short_id ON links(short_id);
  CREATE INDEX IF NOT EXISTS idx_scans_short_id ON scans(short_id);
  CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans(scanned_at);
`);

// Ensure user_id column exists if table was created previously without it
try {
  const columns = db.prepare('PRAGMA table_info(links)').all();
  const hasUserId = columns.some(c => c.name === 'user_id');
  if (!hasUserId) {
    db.exec('ALTER TABLE links ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;');
  }
} catch (e) {
  // column already exists
}

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
  console.log('☁️  Cloudinary configured.');
} else {
  console.log('📁 Local image storage active (Cloudinary credentials not provided).');
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// --- Security & Password Helper Functions ---
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

function parseUserAgent(ua = '') {
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
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

function anonymizeIp(ip = '') {
  if (!ip) return 'Unknown';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 3).join(':')}:*:*`;
  }
  return ip;
}

// --- Authentication Middleware ---
function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.slice(7).trim();
  try {
    const session = db.prepare(`
      SELECT s.token, s.expires_at, u.id, u.email, u.name
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token);

    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }

    req.user = { id: session.id, email: session.email, name: session.name };
    req.token = token;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Server authentication error.' });
  }
}

function authOptional(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.slice(7).trim();
  try {
    const session = db.prepare(`
      SELECT s.token, s.expires_at, u.id, u.email, u.name
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token);

    if (session) {
      req.user = { id: session.id, email: session.email, name: session.name };
      req.token = token;
    } else {
      req.user = null;
    }
    next();
  } catch {
    req.user = null;
    next();
  }
}

// Seed starter demo user if database has no users
try {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (userCount === 0) {
    const { salt, hash } = hashPassword('password123');
    const now = new Date().toISOString();
    const insertUser = db.prepare('INSERT INTO users (email, name, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)');
    insertUser.run('demo@qrstudio.com', 'Demo Organizer', hash, salt, now);
    
    // Assign any existing unowned links to this demo user
    const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@qrstudio.com');
    if (demoUser) {
      db.prepare('UPDATE links SET user_id = ? WHERE user_id IS NULL').run(demoUser.id);
    }
    console.log('👤 Seeded demo user: demo@qrstudio.com (password: password123)');
  }
} catch (e) {
  console.warn('Could not seed initial demo user:', e.message);
}

// --- Auth Endpoints ---

// 1. User Sign Up
app.post('/api/auth/signup', (req, res) => {
  const { email, password, name } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanName = (name && name.trim()) || cleanEmail.split('@')[0];

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const { salt, hash } = hashPassword(password);
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO users (email, name, password_hash, salt, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertStmt.run(cleanEmail, cleanName, hash, salt, now);

    const newUser = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(cleanEmail);

    // Create session (30-day expiration)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(token, newUser.id, now, expiresAt);

    res.status(201).json({
      success: true,
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Sign up error:', err);
    res.status(500).json({ error: 'Could not create user account.' });
  }
});

// 2. User Log In
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter your email and password.' });
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    const user = db.prepare('SELECT id, email, name, password_hash, salt FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = verifyPassword(password, user.salt, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Create session (30-day expiration)
    const token = generateToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(token, user.id, now, expiresAt);

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
    console.error('Log in error:', err);
    res.status(500).json({ error: 'Server error during log in.' });
  }
});

// 3. User Log Out
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    } catch (e) {
      // ignore
    }
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// 4. Current User Session Check
app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

// --- QR & Analytics API Endpoints ---

// 5. Image Upload (Cloudinary with local fallback)
app.post('/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }

  // Attempt Cloudinary upload if configured
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
      console.warn('Cloudinary upload failed, falling back to local storage:', err.message);
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

// 6. Create / Shorten Trackable Link (Scoped to authenticated user)
app.post('/api/shorten', authRequired, (req, res) => {
  const { originalUrl, title, contentType } = req.body;
  if (!originalUrl || typeof originalUrl !== 'string') {
    return res.status(400).json({ error: 'Valid originalUrl is required.' });
  }

  const shortId = generateShortId(7);
  const cleanTitle = (title && title.trim()) || 'Untitled QR Code';
  const type = contentType || 'url';
  const now = new Date().toISOString();

  try {
    const stmt = db.prepare(`
      INSERT INTO links (user_id, short_id, title, original_url, content_type, scan_count, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `);
    stmt.run(req.user.id, shortId, cleanTitle, originalUrl.trim(), type, now);

    const host = req.get('host');
    const shortUrl = `${req.protocol}://${host}/r/${shortId}`;

    res.status(201).json({
      success: true,
      shortId,
      shortUrl,
      title: cleanTitle,
      originalUrl: originalUrl.trim(),
      contentType: type,
      createdAt: now
    });
  } catch (err) {
    console.error('Database error shortening link:', err);
    res.status(500).json({ error: 'Database error creating trackable link.' });
  }
});

// 7. Get All Tracked Links (Filtered to current authenticated user ONLY)
app.get('/api/links', authRequired, (req, res) => {
  try {
    const links = db.prepare(`
      SELECT id, short_id, title, original_url, content_type, scan_count, created_at, last_scanned_at
      FROM links
      WHERE user_id = ?
      ORDER BY id DESC
    `).all(req.user.id);

    const host = req.get('host');
    const enriched = links.map(link => ({
      ...link,
      short_url: `${req.protocol}://${host}/r/${link.short_id}`
    }));

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching links:', err);
    res.status(500).json({ error: 'Could not load your tracked links.' });
  }
});

// 8. Update Link Destination or Title (Ownership protected)
app.patch('/api/links/:shortId', authRequired, (req, res) => {
  const { shortId } = req.params;
  const { title, originalUrl } = req.body;

  try {
    const link = db.prepare('SELECT * FROM links WHERE short_id = ?').get(shortId);
    if (!link) {
      return res.status(404).json({ error: 'Link not found.' });
    }

    if (link.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. You do not own this QR code.' });
    }

    const newTitle = title !== undefined ? title.trim() : link.title;
    const newUrl = originalUrl !== undefined ? originalUrl.trim() : link.original_url;

    db.prepare('UPDATE links SET title = ?, original_url = ? WHERE short_id = ?')
      .run(newTitle, newUrl, shortId);

    res.json({
      success: true,
      message: 'Link updated successfully.',
      link: {
        ...link,
        title: newTitle,
        original_url: newUrl
      }
    });
  } catch (err) {
    console.error('Error updating link:', err);
    res.status(500).json({ error: 'Could not update link.' });
  }
});

// 9. Delete Link (Ownership protected)
app.delete('/api/links/:shortId', authRequired, (req, res) => {
  const { shortId } = req.params;
  try {
    const link = db.prepare('SELECT user_id FROM links WHERE short_id = ?').get(shortId);
    if (!link) {
      return res.status(404).json({ error: 'Link not found.' });
    }

    if (link.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. You do not own this QR code.' });
    }

    db.prepare('DELETE FROM scans WHERE short_id = ?').run(shortId);
    db.prepare('DELETE FROM links WHERE short_id = ?').run(shortId);

    res.json({ success: true, message: 'QR link deleted.' });
  } catch (err) {
    console.error('Error deleting link:', err);
    res.status(500).json({ error: 'Could not delete link.' });
  }
});

// 10. Deep Analytics for Specific QR Code (Ownership protected)
app.get('/api/links/:shortId/analytics', authRequired, (req, res) => {
  const { shortId } = req.params;

  try {
    const link = db.prepare('SELECT * FROM links WHERE short_id = ?').get(shortId);
    if (!link) {
      return res.status(404).json({ error: 'Tracked link not found.' });
    }

    if (link.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. You do not have permission to view this QR code’s analytics.' });
    }

    const host = req.get('host');
    const shortUrl = `${req.protocol}://${host}/r/${link.short_id}`;

    // Total Scans & Unique Visitors
    const totalRow = db.prepare('SELECT count(*) as count FROM scans WHERE short_id = ?').get(shortId);
    const uniqueRow = db.prepare('SELECT count(DISTINCT ip) as count FROM scans WHERE short_id = ?').get(shortId);

    const totalScans = totalRow ? totalRow.count : 0;
    const uniqueScanners = uniqueRow ? uniqueRow.count : 0;

    // Timeline: Daily Scans for the last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const dailyRows = db.prepare(`
      SELECT strftime('%Y-%m-%d', scanned_at) as day, count(*) as count
      FROM scans
      WHERE short_id = ? AND scanned_at >= datetime('now', '-7 days')
      GROUP BY day
    `).all(shortId);

    const dailyMap = {};
    dailyRows.forEach(r => { dailyMap[r.day] = r.count; });
    const timeline = days.map(day => ({
      date: day,
      count: dailyMap[day] || 0
    }));

    // Device breakdown
    const deviceRows = db.prepare(`
      SELECT coalesce(device_type, 'Desktop') as name, count(*) as count
      FROM scans WHERE short_id = ? GROUP BY name ORDER BY count DESC
    `).all(shortId);
    const devices = deviceRows.map(r => ({
      name: r.name,
      count: r.count,
      percentage: totalScans > 0 ? Math.round((r.count / totalScans) * 100) : 0
    }));

    // OS breakdown
    const osRows = db.prepare(`
      SELECT coalesce(os, 'Other') as name, count(*) as count
      FROM scans WHERE short_id = ? GROUP BY name ORDER BY count DESC
    `).all(shortId);
    const operatingSystems = osRows.map(r => ({
      name: r.name,
      count: r.count,
      percentage: totalScans > 0 ? Math.round((r.count / totalScans) * 100) : 0
    }));

    // Browser breakdown
    const browserRows = db.prepare(`
      SELECT coalesce(browser, 'Other') as name, count(*) as count
      FROM scans WHERE short_id = ? GROUP BY name ORDER BY count DESC
    `).all(shortId);
    const browsers = browserRows.map(r => ({
      name: r.name,
      count: r.count,
      percentage: totalScans > 0 ? Math.round((r.count / totalScans) * 100) : 0
    }));

    // Recent Scans (last 20)
    const recentRows = db.prepare(`
      SELECT id, scanned_at, ip, device_type, os, browser, referrer
      FROM scans
      WHERE short_id = ?
      ORDER BY id DESC
      LIMIT 20
    `).all(shortId);

    const recentScans = recentRows.map(r => ({
      id: r.id,
      scannedAt: r.scanned_at,
      deviceType: r.device_type,
      os: r.os,
      browser: r.browser,
      ip: anonymizeIp(r.ip),
      referrer: r.referrer || 'Direct / QR Camera'
    }));

    res.json({
      link: {
        shortId: link.short_id,
        shortUrl,
        title: link.title,
        originalUrl: link.original_url,
        contentType: link.content_type,
        scanCount: link.scan_count,
        createdAt: link.created_at,
        lastScannedAt: link.last_scanned_at
      },
      overview: {
        totalScans,
        uniqueScanners,
        lastScannedAt: link.last_scanned_at
      },
      timeline,
      devices,
      operatingSystems,
      browsers,
      recentScans
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Could not load analytics.' });
  }
});

// 11. User Analytics Overview (Scoped strictly to the authenticated user)
app.get('/api/analytics/overview', authRequired, (req, res) => {
  try {
    const totalCodesRow = db.prepare('SELECT count(*) as count FROM links WHERE user_id = ?').get(req.user.id);
    const totalScansRow = db.prepare(`
      SELECT count(*) as count FROM scans s
      JOIN links l ON s.short_id = l.short_id
      WHERE l.user_id = ?
    `).get(req.user.id);

    const todayScansRow = db.prepare(`
      SELECT count(*) as count FROM scans s
      JOIN links l ON s.short_id = l.short_id
      WHERE l.user_id = ? AND s.scanned_at >= datetime('now', '-1 day')
    `).get(req.user.id);

    const topLink = db.prepare(`
      SELECT short_id, title, original_url, scan_count
      FROM links
      WHERE user_id = ?
      ORDER BY scan_count DESC
      LIMIT 1
    `).get(req.user.id);

    res.json({
      totalCodes: totalCodesRow ? totalCodesRow.count : 0,
      totalScans: totalScansRow ? totalScansRow.count : 0,
      todayScans: todayScansRow ? todayScansRow.count : 0,
      topLink: topLink || null
    });
  } catch (err) {
    console.error('Error fetching user overview:', err);
    res.status(500).json({ error: 'Could not fetch overview.' });
  }
});

// 12. Simulate Scan (Testing helper, ownership protected)
app.post('/api/links/:shortId/simulate-scan', authRequired, (req, res) => {
  const { shortId } = req.params;
  try {
    const link = db.prepare('SELECT * FROM links WHERE short_id = ?').get(shortId);
    if (!link) {
      return res.status(404).json({ error: 'Link not found.' });
    }

    if (link.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. You do not own this QR code.' });
    }

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

    db.prepare(`
      INSERT INTO scans (short_id, scanned_at, ip, user_agent, device_type, browser, os, referrer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(shortId, now, profile.ip, profile.ua, parsed.deviceType, parsed.browser, parsed.os, profile.ref);

    db.prepare(`
      UPDATE links
      SET scan_count = scan_count + 1, last_scanned_at = ?
      WHERE short_id = ?
    `).run(now, shortId);

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
// Anyone who scans the printed QR code can be redirected, regardless of who created it!
app.get('/r/:shortId', (req, res) => {
  const { shortId } = req.params;

  try {
    const link = db.prepare('SELECT * FROM links WHERE short_id = ?').get(shortId);

    if (!link) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Not Found — QR Studio</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-zinc-950 text-zinc-100 min-h-screen flex items-center justify-center p-6">
          <div class="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
            <div class="w-12 h-12 bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-4 font-mono text-xl font-bold">404</div>
            <h1 class="text-2xl font-bold mb-2">QR Code Not Found</h1>
            <p class="text-zinc-400 text-sm mb-6">This dynamic QR link may have expired or was removed by its creator.</p>
            <a href="/" class="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition">Return to QR Studio</a>
          </div>
        </body>
        </html>
      `);
    }

    // Capture scan metadata
    const ua = req.get('user-agent') || '';
    const ip = getClientIp(req);
    const referrer = req.get('referrer') || req.get('referer') || '';
    const { deviceType, os, browser } = parseUserAgent(ua);
    const now = new Date().toISOString();

    // Record scan entry
    db.prepare(`
      INSERT INTO scans (short_id, scanned_at, ip, user_agent, device_type, browser, os, referrer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(shortId, now, ip, ua, deviceType, browser, os, referrer);

    // Update link counters
    db.prepare(`
      UPDATE links
      SET scan_count = scan_count + 1, last_scanned_at = ?
      WHERE short_id = ?
    `).run(now, shortId);

    // Ensure valid URL prefix
    let target = link.original_url;
    if (!/^https?:\/\//i.test(target) && !/^(mailto:|tel:|sms:|wifi:|begin:vcard)/i.test(target)) {
      target = 'https://' + target;
    }

    res.redirect(target);
  } catch (err) {
    console.error('Error during redirect:', err);
    res.status(500).send('Redirection error.');
  }
});

// Fallback to index.html for unmatched routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(port, () => {
  console.log(`✨ QR Studio running at http://localhost:${port}`);
});
