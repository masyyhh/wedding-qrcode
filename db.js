// Unified Production Database Adapter
// Automatically connects to PostgreSQL if DATABASE_URL is set;
// otherwise defaults to native SQLite (WAL mode) for local dev or single-container VPS.
const path = require('path');
const fs = require('fs');

const databaseUrl = process.env.DATABASE_URL || '';
const isPostgres = Boolean(databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')));

let dbEngine = null;
let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
  const { Pool } = require('pg');
  
  // Smart SSL Detection:
  // - Explicitly disabled if DATABASE_SSL === 'false' or url specifies sslmode=disable
  // - Explicitly enabled if DATABASE_SSL === 'true' or url specifies sslmode=require
  // - For local/docker container hosts (e.g. 'postgres', 'localhost', '127.0.0.1', 'db'), default to false
  // - For remote cloud databases (Neon, Supabase, Render, Railway, AWS RDS), default to SSL enabled
  let sslConfig = false;
  if (process.env.DATABASE_SSL === 'true') {
    sslConfig = { rejectUnauthorized: false };
  } else if (process.env.DATABASE_SSL === 'false') {
    sslConfig = false;
  } else {
    try {
      const parsedUrl = new URL(databaseUrl);
      const host = parsedUrl.hostname.toLowerCase();
      const sslMode = parsedUrl.searchParams.get('sslmode');

      if (sslMode === 'disable') {
        sslConfig = false;
      } else if (sslMode === 'require' || sslMode === 'prefer' || sslMode === 'verify-full' || sslMode === 'verify-ca') {
        sslConfig = { rejectUnauthorized: false };
      } else if (
        host === 'postgres' ||
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === 'db' ||
        host.endsWith('.local') ||
        host.endsWith('.internal')
      ) {
        sslConfig = false;
      } else {
        // Remote cloud host
        sslConfig = { rejectUnauthorized: false };
      }
    } catch {
      sslConfig = false;
    }
  }

  const poolOptions = {
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  };

  if (sslConfig) {
    poolOptions.ssl = sslConfig;
  }

  pgPool = new Pool(poolOptions);

  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
  });

  dbEngine = 'postgres';
  console.log(`🐘 Database Engine: PostgreSQL (SSL: ${sslConfig ? 'Active' : 'Disabled'})`);
} else {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(__dirname, 'database.sqlite');
  sqliteDb = new DatabaseSync(dbPath);

  // Enable WAL mode for high concurrency
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  sqliteDb.exec('PRAGMA foreign_keys = ON;');

  dbEngine = 'sqlite';
  console.log('🪶 Database Engine: SQLite (WAL mode)');
}

// --- Migration & Schema Setup ---
async function init() {
  if (isPostgres) {
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255),
          password_hash TEXT NOT NULL,
          salt VARCHAR(64) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sessions (
          token VARCHAR(128) PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL
        );

        CREATE TABLE IF NOT EXISTS links (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          short_id VARCHAR(32) NOT NULL UNIQUE,
          title VARCHAR(255),
          original_url TEXT NOT NULL,
          content_type VARCHAR(32) DEFAULT 'url',
          scan_count INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_scanned_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS scans (
          id SERIAL PRIMARY KEY,
          short_id VARCHAR(32) NOT NULL REFERENCES links(short_id) ON DELETE CASCADE,
          scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ip VARCHAR(64),
          user_agent TEXT,
          device_type VARCHAR(32),
          browser VARCHAR(64),
          os VARCHAR(64),
          referrer TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
        CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
        CREATE INDEX IF NOT EXISTS idx_links_short_id ON links(short_id);
        CREATE INDEX IF NOT EXISTS idx_scans_short_id ON scans(short_id);
        CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans(scanned_at);
      `);
      console.log('✅ PostgreSQL tables verified/created.');
    } finally {
      client.release();
    }
  } else {
    sqliteDb.exec(`
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
    console.log('✅ SQLite tables verified/created.');
  }
}

// --- Query Implementations ---

// Users
async function findUserByEmail(email) {
  const cleanEmail = email.toLowerCase().trim();
  if (isPostgres) {
    const res = await pgPool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    return res.rows[0] || null;
  }
  return sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) || null;
}

async function findUserById(id) {
  if (isPostgres) {
    const res = await pgPool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return sqliteDb.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(id) || null;
}

async function deleteUserByEmail(email) {
  const cleanEmail = email.toLowerCase().trim();
  if (isPostgres) {
    await pgPool.query('DELETE FROM users WHERE email = $1', [cleanEmail]);
  } else {
    sqliteDb.prepare('DELETE FROM users WHERE email = ?').run(cleanEmail);
  }
}

async function createUser({ email, name, passwordHash, salt }) {
  const cleanEmail = email.toLowerCase().trim();
  const now = new Date().toISOString();
  if (isPostgres) {
    const res = await pgPool.query(`
      INSERT INTO users (email, name, password_hash, salt, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, created_at
    `, [cleanEmail, name, passwordHash, salt, now]);
    return res.rows[0];
  }
  sqliteDb.prepare(`
    INSERT INTO users (email, name, password_hash, salt, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(cleanEmail, name, passwordHash, salt, now);

  return sqliteDb.prepare('SELECT id, email, name, created_at FROM users WHERE email = ?').get(cleanEmail);
}

// Sessions
async function createSession({ token, userId, expiresAt }) {
  const now = new Date().toISOString();
  if (isPostgres) {
    await pgPool.query(`
      INSERT INTO sessions (token, user_id, created_at, expires_at)
      VALUES ($1, $2, $3, $4)
    `, [token, userId, now, expiresAt]);
  } else {
    sqliteDb.prepare(`
      INSERT INTO sessions (token, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, now, expiresAt);
  }
}

async function findSession(token) {
  if (isPostgres) {
    const res = await pgPool.query(`
      SELECT s.token, s.expires_at, u.id, u.email, u.name
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $1 AND s.expires_at > NOW()
    `, [token]);
    return res.rows[0] || null;
  }
  return sqliteDb.prepare(`
    SELECT s.token, s.expires_at, u.id, u.email, u.name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token) || null;
}

async function deleteSession(token) {
  if (isPostgres) {
    await pgPool.query('DELETE FROM sessions WHERE token = $1', [token]);
  } else {
    sqliteDb.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
}

// Links
async function createLink({ userId, shortId, title, originalUrl, contentType }) {
  const now = new Date().toISOString();
  if (isPostgres) {
    const res = await pgPool.query(`
      INSERT INTO links (user_id, short_id, title, original_url, content_type, scan_count, created_at)
      VALUES ($1, $2, $3, $4, $5, 0, $6)
      RETURNING *
    `, [userId, shortId, title, originalUrl, contentType, now]);
    return res.rows[0];
  }
  sqliteDb.prepare(`
    INSERT INTO links (user_id, short_id, title, original_url, content_type, scan_count, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run(userId, shortId, title, originalUrl, contentType, now);

  return sqliteDb.prepare('SELECT * FROM links WHERE short_id = ?').get(shortId);
}

async function getLinksByUser(userId) {
  if (isPostgres) {
    const res = await pgPool.query(`
      SELECT id, short_id, title, original_url, content_type, scan_count, created_at, last_scanned_at
      FROM links
      WHERE user_id = $1
      ORDER BY id DESC
    `, [userId]);
    return res.rows;
  }
  return sqliteDb.prepare(`
    SELECT id, short_id, title, original_url, content_type, scan_count, created_at, last_scanned_at
    FROM links
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(userId);
}

async function getLinkByShortId(shortId) {
  if (isPostgres) {
    const res = await pgPool.query('SELECT * FROM links WHERE short_id = $1', [shortId]);
    return res.rows[0] || null;
  }
  return sqliteDb.prepare('SELECT * FROM links WHERE short_id = ?').get(shortId) || null;
}

async function updateLink(shortId, userId, { title, originalUrl }) {
  const link = await getLinkByShortId(shortId);
  if (!link) return { notFound: true };
  if (link.user_id !== userId) return { forbidden: true };

  const newTitle = title !== undefined ? title.trim() : link.title;
  const newUrl = originalUrl !== undefined ? originalUrl.trim() : link.original_url;

  if (isPostgres) {
    await pgPool.query('UPDATE links SET title = $1, original_url = $2 WHERE short_id = $3', [newTitle, newUrl, shortId]);
  } else {
    sqliteDb.prepare('UPDATE links SET title = ?, original_url = ? WHERE short_id = ?').run(newTitle, newUrl, shortId);
  }

  return {
    success: true,
    link: { ...link, title: newTitle, original_url: newUrl }
  };
}

async function deleteLink(shortId, userId) {
  const link = await getLinkByShortId(shortId);
  if (!link) return { notFound: true };
  if (link.user_id !== userId) return { forbidden: true };

  if (isPostgres) {
    await pgPool.query('DELETE FROM scans WHERE short_id = $1', [shortId]);
    await pgPool.query('DELETE FROM links WHERE short_id = $1', [shortId]);
  } else {
    sqliteDb.prepare('DELETE FROM scans WHERE short_id = ?').run(shortId);
    sqliteDb.prepare('DELETE FROM links WHERE short_id = ?').run(shortId);
  }

  return { success: true };
}

// Scans & Analytics
async function recordScan({ shortId, scannedAt, ip, userAgent, deviceType, browser, os, referrer }) {
  if (isPostgres) {
    await pgPool.query(`
      INSERT INTO scans (short_id, scanned_at, ip, user_agent, device_type, browser, os, referrer)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [shortId, scannedAt, ip, userAgent, deviceType, browser, os, referrer]);

    await pgPool.query(`
      UPDATE links
      SET scan_count = scan_count + 1, last_scanned_at = $1
      WHERE short_id = $2
    `, [scannedAt, shortId]);
  } else {
    sqliteDb.prepare(`
      INSERT INTO scans (short_id, scanned_at, ip, user_agent, device_type, browser, os, referrer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(shortId, scannedAt, ip, userAgent, deviceType, browser, os, referrer);

    sqliteDb.prepare(`
      UPDATE links
      SET scan_count = scan_count + 1, last_scanned_at = ?
      WHERE short_id = ?
    `).run(scannedAt, shortId);
  }
}

async function getLinkAnalytics(shortId, userId) {
  const link = await getLinkByShortId(shortId);
  if (!link) return { notFound: true };
  if (link.user_id !== userId) return { forbidden: true };

  let totalScans = 0;
  let uniqueScanners = 0;
  let dailyMap = {};
  let devices = [];
  let operatingSystems = [];
  let browsers = [];
  let recentScans = [];

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  if (isPostgres) {
    const totalRes = await pgPool.query('SELECT count(*)::int as count FROM scans WHERE short_id = $1', [shortId]);
    const uniqueRes = await pgPool.query('SELECT count(DISTINCT ip)::int as count FROM scans WHERE short_id = $1', [shortId]);
    totalScans = totalRes.rows[0]?.count || 0;
    uniqueScanners = uniqueRes.rows[0]?.count || 0;

    const dailyRes = await pgPool.query(`
      SELECT to_char(scanned_at, 'YYYY-MM-DD') as day, count(*)::int as count
      FROM scans
      WHERE short_id = $1 AND scanned_at >= NOW() - INTERVAL '7 days'
      GROUP BY day
    `, [shortId]);
    dailyRes.rows.forEach(r => { dailyMap[r.day] = r.count; });

    const devRes = await pgPool.query(`
      SELECT COALESCE(device_type, 'Desktop') as name, count(*)::int as count
      FROM scans WHERE short_id = $1 GROUP BY name ORDER BY count DESC
    `, [shortId]);
    devices = devRes.rows;

    const osRes = await pgPool.query(`
      SELECT COALESCE(os, 'Other') as name, count(*)::int as count
      FROM scans WHERE short_id = $1 GROUP BY name ORDER BY count DESC
    `, [shortId]);
    operatingSystems = osRes.rows;

    const brRes = await pgPool.query(`
      SELECT COALESCE(browser, 'Other') as name, count(*)::int as count
      FROM scans WHERE short_id = $1 GROUP BY name ORDER BY count DESC
    `, [shortId]);
    browsers = brRes.rows;

    const recRes = await pgPool.query(`
      SELECT id, scanned_at, ip, device_type, os, browser, referrer
      FROM scans WHERE short_id = $1 ORDER BY id DESC LIMIT 50
    `, [shortId]);
    recentScans = recRes.rows;
  } else {
    const totalRow = sqliteDb.prepare('SELECT count(*) as count FROM scans WHERE short_id = ?').get(shortId);
    const uniqueRow = sqliteDb.prepare('SELECT count(DISTINCT ip) as count FROM scans WHERE short_id = ?').get(shortId);
    totalScans = totalRow?.count || 0;
    uniqueScanners = uniqueRow?.count || 0;

    const dailyRows = sqliteDb.prepare(`
      SELECT strftime('%Y-%m-%d', scanned_at) as day, count(*) as count
      FROM scans
      WHERE short_id = ? AND scanned_at >= datetime('now', '-7 days')
      GROUP BY day
    `).all(shortId);
    dailyRows.forEach(r => { dailyMap[r.day] = r.count; });

    devices = sqliteDb.prepare(`
      SELECT coalesce(device_type, 'Desktop') as name, count(*) as count
      FROM scans WHERE short_id = ? GROUP BY name ORDER BY count DESC
    `).all(shortId);

    operatingSystems = sqliteDb.prepare(`
      SELECT coalesce(os, 'Other') as name, count(*) as count
      FROM scans WHERE short_id = ? GROUP BY name ORDER BY count DESC
    `).all(shortId);

    browsers = sqliteDb.prepare(`
      SELECT coalesce(browser, 'Other') as name, count(*) as count
      FROM scans WHERE short_id = ? GROUP BY name ORDER BY count DESC
    `).all(shortId);

    recentScans = sqliteDb.prepare(`
      SELECT id, scanned_at, ip, device_type, os, browser, referrer
      FROM scans WHERE short_id = ? ORDER BY id DESC LIMIT 50
    `).all(shortId);
  }

  const timeline = days.map(day => ({
    date: day,
    count: dailyMap[day] || 0
  }));

  const calcPercentage = (items) => items.map(r => ({
    name: r.name,
    count: r.count,
    percentage: totalScans > 0 ? Math.round((r.count / totalScans) * 100) : 0
  }));

  return {
    success: true,
    link,
    overview: {
      totalScans,
      uniqueScanners,
      lastScannedAt: link.last_scanned_at
    },
    timeline,
    devices: calcPercentage(devices),
    operatingSystems: calcPercentage(operatingSystems),
    browsers: calcPercentage(browsers),
    recentScans
  };
}

async function getUserOverview(userId) {
  if (isPostgres) {
    const totalCodesRes = await pgPool.query('SELECT count(*)::int as count FROM links WHERE user_id = $1', [userId]);
    const totalScansRes = await pgPool.query(`
      SELECT count(*)::int as count FROM scans s
      JOIN links l ON s.short_id = l.short_id
      WHERE l.user_id = $1
    `, [userId]);
    const todayScansRes = await pgPool.query(`
      SELECT count(*)::int as count FROM scans s
      JOIN links l ON s.short_id = l.short_id
      WHERE l.user_id = $1 AND s.scanned_at >= NOW() - INTERVAL '1 day'
    `, [userId]);
    const topLinkRes = await pgPool.query(`
      SELECT short_id, title, original_url, scan_count
      FROM links WHERE user_id = $1 ORDER BY scan_count DESC LIMIT 1
    `, [userId]);

    return {
      totalCodes: totalCodesRes.rows[0]?.count || 0,
      totalScans: totalScansRes.rows[0]?.count || 0,
      todayScans: todayScansRes.rows[0]?.count || 0,
      topLink: topLinkRes.rows[0] || null
    };
  }

  const totalCodesRow = sqliteDb.prepare('SELECT count(*) as count FROM links WHERE user_id = ?').get(userId);
  const totalScansRow = sqliteDb.prepare(`
    SELECT count(*) as count FROM scans s
    JOIN links l ON s.short_id = l.short_id
    WHERE l.user_id = ?
  `).get(userId);
  const todayScansRow = sqliteDb.prepare(`
    SELECT count(*) as count FROM scans s
    JOIN links l ON s.short_id = l.short_id
    WHERE l.user_id = ? AND s.scanned_at >= datetime('now', '-1 day')
  `).get(userId);
  const topLink = sqliteDb.prepare(`
    SELECT short_id, title, original_url, scan_count
    FROM links WHERE user_id = ? ORDER BY scan_count DESC LIMIT 1
  `).get(userId);

  return {
    totalCodes: totalCodesRow?.count || 0,
    totalScans: totalScansRow?.count || 0,
    todayScans: todayScansRow?.count || 0,
    topLink: topLink || null
  };
}

async function getRecentScansForExport(shortId, userId) {
  const link = await getLinkByShortId(shortId);
  if (!link || link.user_id !== userId) return null;

  if (isPostgres) {
    const res = await pgPool.query(`
      SELECT id, scanned_at, ip, device_type, os, browser, referrer
      FROM scans WHERE short_id = $1 ORDER BY id DESC LIMIT 1000
    `, [shortId]);
    return { link, scans: res.rows };
  }

  const scans = sqliteDb.prepare(`
    SELECT id, scanned_at, ip, device_type, os, browser, referrer
    FROM scans WHERE short_id = ? ORDER BY id DESC LIMIT 1000
  `).all(shortId);

  return { link, scans };
}

async function healthCheck() {
  if (isPostgres) {
    const res = await pgPool.query('SELECT 1 as healthy');
    return res.rows[0]?.healthy === 1;
  }
  return sqliteDb.prepare('SELECT 1 as healthy').get()?.healthy === 1;
}

async function close() {
  if (isPostgres && pgPool) {
    await pgPool.end();
  }
}

module.exports = {
  dbEngine,
  isPostgres,
  init,
  findUserByEmail,
  findUserById,
  deleteUserByEmail,
  createUser,
  createSession,
  findSession,
  deleteSession,
  createLink,
  getLinksByUser,
  getLinkByShortId,
  updateLink,
  deleteLink,
  recordScan,
  getLinkAnalytics,
  getUserOverview,
  getRecentScansForExport,
  healthCheck,
  close
};
