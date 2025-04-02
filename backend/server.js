const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI'
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
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
    exposedHeaders: ['Authorization', 'Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 hours
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

// MongoDB connection
const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 3000,
            socketTimeoutMS: 5000,
            maxPoolSize: 10,
            minPoolSize: 5,
            retryWrites: true,
            retryReads: true
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // Log connection details
        console.log('MongoDB Connection Details:', {
            host: conn.connection.host,
            port: conn.connection.port,
            name: conn.connection.name,
            readyState: conn.connection.readyState
        });
    } catch (error) {
        console.error('MongoDB Connection Error:', {
            message: error.message,
            name: error.name,
            code: error.code,
            stack: error.stack
        });
        process.exit(1);
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

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        path: req.path,
        method: req.method
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
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});