const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

const app = express();
const upload = multer({
    limits: { fileSize: 64 * 1024 * 1024 }, // 64MB limit
    fileFilter: (req, file, cb) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/gif', 'image/webp'];
        if (validTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file format. Use JPG, PNG, BMP, GIF, or WEBP.'));
        }
    }
});

const API_KEY = '6d207e02198a847aa98d0a2a901485a5';
const API_URL = 'https://freeimage.host/api/1/upload';

app.post('/api/upload', upload.single('source'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const form = new FormData();
        form.append('key', API_KEY);
        form.append('action', 'upload');
        form.append('format', 'json');
        form.append('source', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        const response = await axios.post(API_URL, form, {
            headers: { ...form.getHeaders() },
            timeout: 30000 
        });

        const data = response.data;

        if (data.status_code === 200) {
            res.json({
                success: true,
                image_url: data.image.url,
                thumbnail_url: data.image.thumb.url,
                viewer_url: data.image.url_viewer
            });
        } else {
            res.status(500).json({ error: data.status_txt || 'Unknown server error', details: data });
        }
    } catch (error) {
        if (error.response) {
            res.status(500).json({ error: error.response.data.status_txt || 'Server error', details: error.response.data });
        } else if (error.code === 'ECONNABORTED') {
            res.status(504).json({ error: 'Request timed out after 30 seconds' });
        } else if (error.message.includes('Unsupported file format')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Vercel requires a default export
module.exports = app;