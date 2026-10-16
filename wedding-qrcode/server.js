// Load environment variables from .env file
require('dotenv').config(); 
const express = require('express');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { nanoid } = require('nanoid');

const app = express();
const port = process.env.PORT || 3000;

// --- Database Setup ---
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error("Error opening database " + err.message);
    } else {
        db.run('CREATE TABLE IF NOT EXISTS links (id INTEGER PRIMARY KEY AUTOINCREMENT, short_id TEXT NOT NULL UNIQUE, original_url TEXT NOT NULL, scan_count INTEGER DEFAULT 0)');
    }
});

// --- Cloudinary Configuration ---
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
} else {
    console.warn("Cloudinary environment variables not set. Image upload will not work.");
}

// --- Middleware ---
app.use(cors());
app.use(express.json()); // To parse JSON bodies
app.use(express.static(__dirname)); // Serve static files like index.html

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

// --- API Routes ---

// 1. Image Upload Endpoint
app.post('/upload-image', upload.single('image'), (req, res) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
        return res.status(500).json({ error: "Cloudinary is not configured on the server." });
    }
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided.' });
    }

    cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
        if (error || !result) {
            console.error('Cloudinary upload error:', error);
            return res.status(500).json({ error: 'Error uploading image to Cloudinary.' });
        }
        res.json({ imageUrl: result.secure_url });
    }).end(req.file.buffer);
});

// 2. Link Shortening Endpoint
app.post('/api/shorten', (req, res) => {
    const { originalUrl } = req.body;
    if (!originalUrl) {
        return res.status(400).json({ error: 'Original URL is required.' });
    }

    const shortId = nanoid(7);
    const sql = `INSERT INTO links (short_id, original_url) VALUES (?, ?)`;

    db.run(sql, [shortId, originalUrl], function(err) {
        if (err) {
            console.error("Database error:", err.message);
            return res.status(500).json({ error: 'Could not create short link.' });
        }
        const shortUrl = `${req.protocol}://${req.get('host')}/r/${shortId}`;
        res.status(201).json({ shortUrl });
    });
});

// 3. Get All Tracked Links
app.get('/api/links', (req, res) => {
    db.all("SELECT short_id, original_url, scan_count FROM links ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            res.status(500).send({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// --- Redirect Route ---
app.get('/r/:shortId', (req, res) => {
    const { shortId } = req.params;
    
    // First, find the URL
    db.get("SELECT original_url FROM links WHERE short_id = ?", [shortId], (err, row) => {
        if (err || !row) {
            return res.status(404).send('URL not found');
        }
        
        // If found, update the count (fire and forget)
        db.run("UPDATE links SET scan_count = scan_count + 1 WHERE short_id = ?", [shortId], (updateErr) => {
            if (updateErr) {
                console.error("Failed to update scan count:", updateErr);
            }
        });

        // Redirect immediately
        res.redirect(row.original_url);
    });
});


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

