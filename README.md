# QR Studio — Modern Minimalist QR Generator & Analytics

A modern, minimalist, publication-grade QR code generator equipped with **user authentication**, **private per-QR code analytics**, dynamic link redirection, live device/browser breakdowns, and custom styling.

---

## ✨ Features

### 1. User Authentication & Private Dashboard
- **Secure Native Cryptography**: Uses Node's built-in `crypto.scryptSync` with random salt generation (OWASP recommended standard) — zero third-party C++ dependencies or compilation issues.
- **Private QR Code Ownership**: Users only see, manage, and view analytics for their own generated QR codes.
- **Session Tokens**: 30-day bearer token session management with automatic renewal and secure logout.
- **Public Scans with Private Analytics**: Physical QR codes (`/r/:shortId`) remain 100% public for wedding guests and customers to scan, while tracking analytics remain private to the QR code owner.
- **Demo Account Provided**: Test immediately with `demo@qrstudio.com` (password: `password123`).

### 2. Modern & Minimalist Studio Design
- **Linear & Vercel-inspired Aesthetics**: Clean typography (Inter & JetBrains Mono), crisp borders, delicate shadows, and responsive two-column workspace.
- **Dark Mode Support**: Seamless toggle between dark and light themes with preference persistence.
- **Multiple Content Types**:
  - 🔗 **URL / Link**: Web destinations, digital menus, portfolios.
  - 📝 **Plain Text**: Quotes, notes, table seating cards.
  - 🖼️ **Image / File**: Drag-and-drop file upload (with Cloudinary cloud storage or local storage fallback).
  - 📶 **Wi-Fi**: SSID, password, and security types (WPA/WPA2/WPA3, WEP, Open).
  - 📇 **vCard Contact**: Full name, phone, email, and organization.
  - ✉️ **Email**: Recipient, subject, and prefilled message body.

### 3. High-Precision QR Styling
- **Dot Styles**: Rounded, Modern Dots, Extra-Rounded, Classy, Classy-Rounded, Classic Square.
- **Corner Squares & Dots**: Custom corner outer shapes and inner dots.
- **Curated Color Palettes**: Obsidian Noir, Forest Pine, Royal Navy, Velvet Berry, or custom hex codes.
- **Gradients & Transparency**: Linear/radial color gradients and transparent background toggle for print overlays.
- **Center Logos & Badges**: Built-in wedding heart, Wi-Fi, globe, phone, mail icons, or custom logo upload.
- **Export Options**: PNG (HD 1000px, Ultra Print 2000px), vector SVG, WebP, JPEG, and 1-click **Copy to Clipboard**.

### 4. Comprehensive Per-QR Analytics
Each dynamic QR code features a dedicated private analytics dashboard:
- 📈 **Total Scans & Unique Visitors**: Tracks overall engagements and distinct scanners.
- ⏱️ **Scan Velocity (7-Day Timeline)**: Interactive SVG bar chart showing daily scan patterns with hover counts.
- 📱 **Device Breakdown**: Real-time distribution (Mobile vs. Tablet vs. Desktop) with progress bars.
- 💻 **Operating System Tracking**: iOS, Android, macOS, Windows, Linux.
- 🌐 **Browser Insights**: Safari, Chrome, Firefox, Edge, Samsung Internet.
- 📋 **Recent Scans Feed**: Live chronological log showing timestamp, device type, OS, browser, anonymized IP, and referrer.
- ⚡ **Scan Simulator**: Built-in test scan simulator to preview analytics in 1 click without needing a physical phone.
- 🔄 **Dynamic Destination Updating**: Change where the QR code redirects at any time without reprinting the physical code!

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+ or v26+ recommended; uses native `node:sqlite` and `node:crypto`)

### Installation & Run

```bash
# Start server
npm start

# Or start in watch/development mode
npm run dev
```

Open your browser to:
```
http://localhost:3000
```

> **Demo Credentials**:
> - Email: `demo@qrstudio.com`
> - Password: `password123`
> *(You can also click "Create Account" to register your own account in seconds).*

---

## 🛠️ API Reference

### Authentication Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create a new user account (`{ email, password, name }`) |
| `POST` | `/api/auth/login` | Authenticate user and receive 30-day session token |
| `POST` | `/api/auth/logout` | Revoke session token |
| `GET` | `/api/auth/me` | Fetch currently logged-in user profile |

### QR Code & Analytics Endpoints (Protected by Bearer Token)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/shorten` | Create a dynamic trackable QR link owned by the user |
| `GET` | `/api/links` | Retrieve all tracked links owned by the authenticated user |
| `GET` | `/api/links/:shortId/analytics` | Deep analytics for a link (ownership protected) |
| `PATCH` | `/api/links/:shortId` | Update destination URL or title dynamically |
| `DELETE` | `/api/links/:shortId` | Delete link and its scan logs |
| `POST` | `/api/links/:shortId/simulate-scan`| Simulate a realistic test scan |
| `GET` | `/api/analytics/overview` | User's global KPI metrics (total codes, total scans, 24h velocity) |

### Public Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload-image` | Upload image (Cloudinary or local fallback) |
| `GET` | `/r/:shortId` | Public redirect endpoint: records scan analytics and forwards to target |

---

## 📁 Project Structure

```text
wedding-qrcode/
├── server.js            # Express 5 backend with scrypt auth, native SQLite & analytics
├── public/
│   ├── index.html       # Modern minimalist UI with auth modal, tabs & SVG charts
│   └── uploads/         # Local file storage fallback for uploaded images
├── database.sqlite      # SQLite database (Users, Sessions, Links, Scans)
├── package.json         # Dependencies & scripts
└── .gitignore           # Git ignore rules
```
