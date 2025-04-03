const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();
const { connectWithRetry, isConnected } = require('./utils/db');
const checkDatabaseConnection = require('./middleware/dbMiddleware');
const healthRoutes = require('./routes/healthRoutes');
const userRoutes = require('./routes/userRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const googleAuthRoutes = require('./routes/googleAuth');
const authRoutes = require('./routes/authRoutes');

// Validate required environment variables
const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'GOOGLE_CALLBACK_URL'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    process.exit(1);
}

console.log('Environment check passed. Starting server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Missing');
console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing');

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
    origin: ['https://cypherium.vercel.app', 'http://localhost:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add pre-flight handling
app.options('*', cors());

// Add headers middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

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

// Initialize database connection
connectWithRetry();

// Add database connection check middleware
app.use('/api', async (req, res, next) => {
    if (!isConnected()) {
        console.log('Database not connected, attempting to reconnect...');
        try {
            await connectWithRetry();
            if (!isConnected()) {
                return res.status(503).json({
                    error: 'Database connection is not ready',
                    message: 'Please try again in a few moments'
                });
            }
        } catch (error) {
            console.error('Database connection error:', error);
            return res.status(503).json({
                error: 'Database connection failed',
                message: 'Please try again later'
            });
        }
    }
    next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth/google', googleAuthRoutes);
app.use('/api/user', userRoutes);
app.use('/api/investments', investmentRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        headers: req.headers
    });

    if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
        return res.status(504).json({ 
            message: 'Request timeout',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        return res.status(500).json({ 
            message: 'Database error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    if (err.name === 'TypeError' && err.message.includes('Cannot read property')) {
        return res.status(500).json({ 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    res.status(500).json({ 
        message: 'Internal server error',
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Database connection status:', isConnected() ? 'Connected' : 'Disconnected');
});