const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

console.log('Starting server initialization...');
console.log('Environment:', process.env.NODE_ENV);
console.log('MongoDB URI present:', !!process.env.MONGODB_URI);
console.log('Google Client ID present:', !!process.env.GOOGLE_CLIENT_ID);

const app = express();

// Optimize for Vercel serverless
app.use((req, res, next) => {
    // Set shorter timeouts for Vercel
    req.setTimeout(8000); // 8 seconds to allow for some buffer
    res.setTimeout(8000);
    next();
});

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://localhost:5003',
        'https://cypherium2.vercel.app',
        'https://cypherium1.vercel.app',
        'https://cypherium.vercel.app',
        'https://*.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Authorization', 'Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Add pre-flight handling
app.options('*', cors());

// Middleware
app.use(express.json({ limit: '10kb' })); // Limit JSON body size
app.use(express.static(path.join(__dirname, '../frontend')));

// Add error handling for JSON parsing
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: 'Invalid JSON' });
    }
    next();
});

// MongoDB Connection with optimized settings
const connectDB = async () => {
    console.log('Attempting MongoDB connection...');
    const startTime = Date.now();
    
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 3000, // Reduced timeout
            socketTimeoutMS: 5000, // Reduced timeout
            retryWrites: true,
            w: 'majority',
            maxPoolSize: 5, // Reduced pool size
            minPoolSize: 1, // Minimal pool size
            connectTimeoutMS: 3000 // Added connection timeout
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Connection time: ${Date.now() - startTime}ms`);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        console.log(`Connection failed after ${Date.now() - startTime}ms`);
        // Don't retry in production
        if (process.env.NODE_ENV !== 'production') {
            console.log('Retrying connection in 3 seconds...');
            setTimeout(connectDB, 3000);
        }
    }
};

// Only connect to MongoDB if we're not in a Vercel serverless function
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    connectDB();
} else {
    console.log('Skipping MongoDB connection in Vercel serverless environment');
}

// Import routes
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/authRoutes');
const googleAuthRoutes = require('./routes/googleAuth');

// Use routes
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth/google', googleAuthRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Handle 504 Gateway Timeout
app.use((req, res, next) => {
    res.setTimeout(8000, () => {
        console.log('Request timed out after 8 seconds');
        res.status(504).json({ message: 'Gateway timeout' });
    });
    next();
});

console.log('Server initialization complete');
module.exports = app;

// Start server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});