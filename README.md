# QR Patterns — Modern Minimalist QR Generator & Real-Time Analytics Platform

A production-grade, publication-quality QR code platform designed for **`qrpatterns.site`**, equipped with **user authentication**, **private real-time analytics**, **PostgreSQL & SQLite dual-database support**, dynamic redirect control, enterprise security hardening, and high-precision styling.

---

## 🌟 Production Architecture & Highlights

### 1. Hardened Security for Public Internet Deployment
- **Domain & SSL**: Native Caddy integration with zero-maintenance Let's Encrypt / ZeroSSL certificates and automatic HTTP-to-HTTPS / `www` redirects.
- **Helmet Security Headers**: Content Security Policy (CSP), frame protection (`X-Frame-Options: DENY`), and MIME-sniffing prevention.
- **Tiered Rate Limiting (`express-rate-limit`)**:
  - `authLimiter`: 15 attempts / 15 mins (stops credential stuffing and brute-force).
  - `apiLimiter`: 180 requests / min (prevents API flooding).
  - `linkCreationLimiter`: 40 links / 15 mins (stops link spam).
  - `redirectLimiter`: 400 scans / min (protects redirects while allowing real guests through).
- **SSRF & Open-Redirect Defense**: Validates URL protocols (`http:`, `https:`, `mailto:`, `tel:`, etc.) and strictly blocks dangerous schemes (`javascript:`, `data:`, `file:`) and private/loopback IP addresses (`localhost`, `127.0.0.1`, `169.254.169.254`, `192.168.*`, `10.*`).
- **CSV Formula Injection Sanitization (DDE)**: In CSV export, all cells beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` are prefixed with `'` to prevent malicious spreadsheet formula execution.
- **ReDoS Defense & Length Bounding**: User-Agent and Referrer headers are capped to 500 characters before regex analysis.
- **IP Privacy & IPv6 Normalization**: Strips `::ffff:` IPv4-mapped IPv6 prefixes and anonymizes client IPs (`198.51.*.*`) for GDPR privacy compliance.
- **Native `scrypt` Cryptography**: High-cost password hashing with random salt and `crypto.timingSafeEqual` constant-time verification.
- **Production Demo Purging**: Setting `SEED_DEMO="false"` automatically disables and purges the demo account.

### 2. Robust Dual-Database Engine (`db.js`)
- **PostgreSQL Ready for Production**: Connects automatically to PostgreSQL via connection pooling (`pg.Pool`), SSL support, and automatic table and index creation.
- **Zero-Config SQLite Fallback**: If `DATABASE_URL` is omitted, defaults seamlessly to native SQLite (WAL mode) for local dev without extra dependencies.

### 3. User Authentication & Private Workspaces
- **Private QR Code Ownership**: Users only see, manage, and view analytics for their own generated QR codes.
- **Session Tokens**: 30-day session management via Bearer tokens and HttpOnly secure cookies.
- **Public Scans with Private Analytics**: Physical QR codes (`/r/:shortId`) remain 100% public for wedding guests and customers to scan, while tracking analytics remain private to the QR code owner.

### 4. Advanced Analytics & CSV Export
- 📈 **Total Scans & Unique Visitors**: Real-time engagement counters.
- ⏱️ **Scan Velocity (7-Day Timeline)**: Interactive SVG bar chart showing daily scan patterns with hover tooltips.
- 📱 **Device Breakdown**: Distribution across Mobile, Tablet, and Desktop with percentage bars.
- 💻 **Operating System Tracking**: iOS, Android, macOS, Windows, Linux.
- 🌐 **Browser Insights**: Safari, Chrome, Firefox, Edge, Samsung Internet.
- 📋 **Recent Scans Feed**: Live chronological log showing timestamp, device type, OS, browser, anonymized IP, and referrer.
- 📊 **Export Scans to CSV**: 1-click button to download raw scan logs with DDE attack protection.
- ⚡ **Scan Simulator**: Built-in test scan simulator to preview analytics in 1 click without needing a physical phone.
- 🔄 **Dynamic Destination Updating**: Change where the QR code redirects at any time without reprinting the physical code!

---

## 🚀 Quick Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start server (starts on SQLite by default on port 5001)
npm start

# Or development watch mode
npm run dev
```

Visit **`http://localhost:5001`** in your browser.

---

## 🐳 Production Deployment on DigitalOcean Droplet (qrpatterns.site)

### Method 1: Standalone Stack (Docker Compose + Caddy)

Use this method if `qrpatterns.site` runs on its own droplet or handles ports 80/443 directly.

1. **Clone repository onto your droplet**:
   ```bash
   git clone <repo-url> /opt/qrpatterns
   cd /opt/qrpatterns
   ```

2. **Configure production environment**:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Set your keys:
   ```env
   NODE_ENV="production"
   PORT=5001
   POSTGRES_USER="qrpatterns"
   POSTGRES_PASSWORD="generate_a_strong_password"
   POSTGRES_DB="qrpatterns"
   JWT_SECRET="<generate with: openssl rand -hex 32>"
   ENCRYPTION_KEY="<generate with: openssl rand -hex 32>"
   CLIENT_URL="https://qrpatterns.site"
   DOMAIN="qrpatterns.site"
   SEED_DEMO="false"
   ```

3. **Start the stack**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

4. **Verify status**:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs -f app
   ```

---

### Method 2: Multi-Site Setup (Sharing existing Caddy with Faisaa)

If your droplet already has Caddy running on ports 80/443 for another site (e.g., Faisaa), follow these 2 simple steps:

1. **Add `qrpatterns.site` block to your existing Caddyfile**:
   ```caddy
   www.qrpatterns.site {
       redir https://qrpatterns.site{uri} permanent
   }

   qrpatterns.site {
       encode zstd gzip

       reverse_proxy qrpatterns-app:5001 {
           header_up X-Real-IP {remote_host}
           header_up X-Forwarded-For {remote_host}
           header_up X-Forwarded-Proto {scheme}
       }

       header {
           Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
           X-Content-Type-Options "nosniff"
           X-Frame-Options "DENY"
           Referrer-Policy "strict-origin-when-cross-origin"
       }
   }
   ```

2. **Connect the Caddy network to `qrpatterns_net`**:
   ```bash
   docker network connect qrpatterns_net <your-existing-caddy-container-name>
   docker exec <your-existing-caddy-container-name> caddy reload --config /etc/caddy/Caddyfile
   ```

---

## 🛠️ API Reference

### Health & Monitoring
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check: uptime, memory, database connection status |

### Authentication Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create user account (`{ email, password, name }`) [Rate Limited] |
| `POST` | `/api/auth/login` | Authenticate and receive session token [Rate Limited] |
| `POST` | `/api/auth/logout` | Revoke session token and clear cookies with root path |
| `GET` | `/api/auth/me` | Fetch currently logged-in user profile |

### QR Code & Analytics Endpoints (Bearer Token Required)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/shorten` | Create a dynamic trackable QR link [Rate Limited & SSRF Protected] |
| `GET` | `/api/links` | Retrieve all tracked links owned by the authenticated user |
| `GET` | `/api/links/:shortId/analytics` | Deep analytics for a link (ownership protected) |
| `PATCH` | `/api/links/:shortId` | Update destination URL or title dynamically |
| `DELETE` | `/api/links/:shortId` | Delete link and its scan logs |
| `GET` | `/api/links/:shortId/export-csv` | Export scan history as CSV with DDE formula injection protection |
| `POST` | `/api/links/:shortId/simulate-scan`| Simulate a realistic test scan |
| `GET` | `/api/analytics/overview` | User's global KPI metrics (total codes, total scans, 24h velocity) |

### Public Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload-image` | Upload image (Cloudinary or local fallback) |
| `GET` | `/r/:shortId` | Public redirect endpoint: logs scan analytics and forwards to target [Rate Limited] |

---

## 📁 Project Structure

```text
qrpatterns/
├── server.js               # Express 5 app with Helmet, Rate Limiting, SSRF defense & APIs
├── db.js                   # Dual-engine database adapter (PostgreSQL + SQLite)
├── public/
│   ├── index.html          # Minimalist UI with auth modal, dynamic QR preview & SVG charts
│   └── uploads/            # Local file storage fallback for uploaded images
├── Dockerfile              # Multi-stage Node 22 Alpine production container
├── .dockerignore           # Prevents secrets, node_modules, and local files leaking into images
├── docker-compose.prod.yml # Production orchestration (PostgreSQL 16 + App + Caddy)
├── Caddyfile               # Production reverse proxy with automatic SSL and HSTS
├── .env.example            # Production environment template
├── database.sqlite         # Local development SQLite database (WAL mode)
└── package.json            # Node.js dependencies & scripts
```
