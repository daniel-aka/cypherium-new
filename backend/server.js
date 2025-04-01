const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// CORS configuration
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'http://localhost:5500',  // Frontend development server
            'http://localhost:5003',  // Backend server
            'https://cypherium2.vercel.app',
            'https://cypherium1.vercel.app',
            'https://cypherium.vercel.app',
            'https://*.vercel.app'    // Allow all Vercel subdomains
        ];
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Blocked origin:', origin);  // Log blocked origins for debugging
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Authorization', 'Content-Type']
}));

// Add pre-flight handling
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Add error handling for JSON parsing
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: 'Invalid JSON' });
    }
    next();
});

// MongoDB Connection with retry logic
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority',
            maxPoolSize: 10,
            minPoolSize: 5
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        // Don't retry in production
        if (process.env.NODE_ENV !== 'production') {
            setTimeout(connectDB, 5000);
        }
    }
};

// Only connect to MongoDB if we're not in a Vercel serverless function
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    connectDB();
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
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Simple admin login route
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    // Hardcoded admin credentials
    if (username === 'admin' && password === 'admin123') {
        res.json({ 
            success: true,
            admin: { 
                id: 'admin', 
                username: 'admin' 
            }
        });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// Serve frontend files
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin-login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-login.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// Export the Express app for Vercel
module.exports = app;

// Start server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});