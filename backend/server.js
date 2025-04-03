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
    origin: function(origin, callback) {
        const allowedOrigins = [
            'http://localhost:5500',
            'http://localhost:5003',
            'https://cypherium2.vercel.app',
            'https://cypherium1.vercel.app',
            'https://cypherium.vercel.app',
            'https://*.vercel.app'
        ];
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            console.error('CORS error:', { origin, msg });
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-Requested-With',
        'Origin',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Methods'
    ],
    exposedHeaders: ['Authorization', 'Content-Type', 'Access-Control-Allow-Origin'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 hours
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

// MongoDB connection
const connectDB = async () => {
    try {
        // Check if already connected
        if (mongoose.connection.readyState === 1) {
            console.log('MongoDB already connected');
            return true;
        }

        console.log('Attempting to connect to MongoDB...');
        console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Missing');
        
        // Optimize connection for serverless
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 3000, // Reduced timeout
            socketTimeoutMS: 3000, // Reduced timeout
            maxPoolSize: 10,
            minPoolSize: 5,
            retryWrites: true,
            retryReads: true,
            connectTimeoutMS: 3000, // Reduced timeout
            heartbeatFrequencyMS: 1000,
            maxIdleTimeMS: 3000, // Reduced timeout
            keepAlive: true,
            keepAliveInitialDelay: 300000,
            autoIndex: false,
            family: 4 // Use IPv4, skip trying IPv6
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // Log connection details
        console.log('MongoDB Connection Details:', {
            host: conn.connection.host,
            port: conn.connection.port,
            name: conn.connection.name,
            readyState: conn.connection.readyState,
            maxPoolSize: conn.connection.maxPoolSize,
            minPoolSize: conn.connection.minPoolSize
        });

        return true;
    } catch (error) {
        console.error('MongoDB Connection Error:', {
            message: error.message,
            name: error.name,
            code: error.code,
            stack: error.stack
        });
        return false;
    }
};

// Connect to MongoDB in all environments
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

// Add MongoDB connection check middleware
app.use(async (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        console.log('MongoDB connection state:', mongoose.connection.readyState);
        // Try to reconnect if not connected
        if (mongoose.connection.readyState === 0) {
            try {
                const connected = await connectDB();
                if (!connected) {
                    return res.status(503).json({ 
                        error: 'Database error',
                        details: 'Failed to connect to database',
                        retry: true
                    });
                }
            } catch (error) {
                console.error('Failed to reconnect to MongoDB:', error);
                return res.status(503).json({ 
                    error: 'Database error',
                    details: 'Failed to connect to database',
                    retry: true
                });
            }
        }
    }
    next();
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const adminRoutes = require('./routes/admin');
const googleAuthRoutes = require('./routes/googleAuth');
const passwordRoutes = require('./routes/password');
const verificationRoutes = require('./routes/verification');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/google', googleAuthRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/verification', verificationRoutes);

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
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});