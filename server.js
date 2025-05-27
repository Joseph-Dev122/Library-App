import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from "mongoose";
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import Book from './src/models/Book.js';
import User from './src/models/User.js';

import authRoutes from './src/routes/authRoutes.js';
import bookRoutes from './src/routes/bookRoutes.js';



// Initialize environment variables
dotenv.config();


// Validate critical environment variables
const requiredEnvVars = ['PORT', 'MONGO_URI', 'JWT_SECRET'];
requiredEnvVars.forEach(env => {
  if (!process.env[env]) {
    console.error(`❌ Missing required environment variable: ${env}`);
    process.exit(1);
  }
});


// Setup __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Create Express app
const app = express();



// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : process.env.PRODUCTION_FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Range'],
  exposedHeaders: ['Content-Range', 'Content-Length', 'Content-Type']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Database connection with improved error handling
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected to Atlas'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });



// Define uploads directory
const UPLOADS_DIR = path.join(__dirname, 'uploads');
console.log('📁 Uploads directory:', UPLOADS_DIR);



// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);



// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date()
    });
});


// Add to your server routes
app.get('/api/test-file', async (req, res) => {
    try {
        const testFilePath = path.join(UPLOADS_DIR, 'books/test.epub');
        res.sendFile(testFilePath, {
            headers: {
                'Content-Type': 'application/epub+zip'
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// Secure File Delivery Endpoint
app.get('/uploads/books/:filename', async (req, res) => {
    try {
        const token = req.query.token || req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(403).json({ error: 'Access token required' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(403).json({ error: 'Invalid user' });

        const book = await Book.findOne({ filePath: `books/${req.params.filename}` });
        if (!book) return res.status(404).json({ error: 'Book not found' });

        const filePath = path.join(UPLOADS_DIR, book.filePath);
        res.sendFile(filePath, {
            headers: {
                'Content-Type': getContentType(req.params.filename),
                'Cache-Control': 'no-store'
            }
        });
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Invalid token' });
        }
        res.status(500).json({ error: 'File access failed' });
    }
});

// Content type helper
function getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ext === '.pdf' ? 'application/pdf' : 
           ext === '.epub' ? 'application/epub+zip' :
           'application/octet-stream';
}

// Serve static files (development only)
if (process.env.NODE_ENV === 'development') {
    app.use('/uploads/covers', express.static(path.join(UPLOADS_DIR, 'covers')));
}

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});


// Start server
app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${process.env.PORT}`);
});