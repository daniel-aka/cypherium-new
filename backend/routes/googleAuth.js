const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Initialize Google OAuth client with error handling
let client;
try {
    if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error('GOOGLE_CLIENT_ID is not set');
    }
    client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    console.log('Google OAuth client initialized successfully');
} catch (error) {
    console.error('Failed to initialize Google OAuth client:', error);
    throw error;
}

// Token cache to prevent repeated processing
const tokenCache = new Map();

// Helper function to handle user authentication
async function handleUserAuth(payload) {
    try {
        console.log('Starting user authentication for:', payload.email);
        
        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            console.error('MongoDB is not connected. Current state:', mongoose.connection.readyState);
            throw new Error('Database connection is not ready');
        }

        // Validate payload
        if (!payload.email || !payload.sub) {
            throw new Error('Invalid payload: missing required fields');
        }

        // Lookup user with timeout and retry
        let user = null;
        let retries = 3;
        
        while (retries > 0) {
            try {
                user = await Promise.race([
                    User.findOne({ email: payload.email }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('User lookup timeout')), 5000)
                    )
                ]);
                break;
            } catch (error) {
                console.error(`User lookup attempt ${4 - retries} failed:`, error);
                retries--;
                if (retries === 0) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
        }

        if (user) {
            console.log('Existing user found:', user.email);
            return user;
        }

        console.log('Creating new user for:', payload.email);
        const newUser = new User({
            email: payload.email,
            name: payload.name,
            googleId: payload.sub,
            profilePicture: payload.picture,
            emailVerified: payload.email_verified || false
        });

        // Save with retry
        retries = 3;
        while (retries > 0) {
            try {
                await newUser.save();
                console.log('New user created successfully');
                return newUser;
            } catch (error) {
                console.error(`User creation attempt ${4 - retries} failed:`, error);
                retries--;
                if (retries === 0) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        console.error('User authentication error:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code,
            mongodbState: mongoose.connection.readyState
        });
        throw error;
    }
}

// Google Sign-In endpoint
router.post('/', async (req, res) => {
    try {
        console.log('Received Google sign-in request');
        console.log('Environment check:', {
            GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
            MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Missing',
            NODE_ENV: process.env.NODE_ENV || 'development',
            MongoDB_State: mongoose.connection.readyState
        });
        
        const { credential } = req.body;

        if (!credential) {
            console.error('No credential provided');
            return res.status(400).json({ error: 'No credential provided' });
        }

        // Check token cache
        if (tokenCache.has(credential)) {
            console.log('Using cached token');
            return res.json(tokenCache.get(credential));
        }

        if (!process.env.GOOGLE_CLIENT_ID) {
            console.error('GOOGLE_CLIENT_ID is not set');
            return res.status(500).json({ 
                error: 'Configuration error',
                details: 'GOOGLE_CLIENT_ID is not set'
            });
        }

        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            console.error('MongoDB is not connected. Current state:', mongoose.connection.readyState);
            // Try to reconnect
            try {
                await mongoose.connect(process.env.MONGODB_URI, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    serverSelectionTimeoutMS: 5000,
                    socketTimeoutMS: 5000,
                    keepAlive: true,
                    keepAliveInitialDelay: 300000
                });
                console.log('MongoDB reconnected successfully');
            } catch (error) {
                console.error('Failed to reconnect to MongoDB:', error);
                return res.status(503).json({ 
                    error: 'Database error',
                    details: 'Failed to connect to database'
                });
            }
        }

        console.log('Verifying Google token');
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        console.log('Token verified for:', payload.email);

        // Validate token audience
        if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
            console.error('Invalid token audience:', payload.aud);
            return res.status(401).json({ error: 'Invalid token audience' });
        }

        const user = await handleUserAuth(payload);

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email,
                role: user.role || 'user'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Cache the token result
        tokenCache.set(credential, { user, token });
        
        res.json({ user, token });
    } catch (error) {
        console.error('Google authentication error:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code,
            mongodbState: mongoose.connection.readyState
        });
        
        // Handle specific error types
        if (error.message.includes('Token used too late')) {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (error.message.includes('Invalid token signature')) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.message.includes('User lookup timeout')) {
            return res.status(504).json({ error: 'Database timeout' });
        }
        if (error.message.includes('Invalid payload')) {
            return res.status(400).json({ error: error.message });
        }
        if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            return res.status(503).json({ 
                error: 'Database error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
        if (error.message.includes('Database connection is not ready')) {
            return res.status(503).json({ 
                error: 'Database error',
                details: 'Database connection is not ready'
            });
        }
        
        res.status(500).json({ 
            error: 'Authentication failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Test endpoint for debugging
router.post('/test', async (req, res) => {
    try {
        console.log('Test endpoint called with body:', req.body);
        
        // Check if Google Client ID is set
        if (!process.env.GOOGLE_CLIENT_ID) {
            console.error('GOOGLE_CLIENT_ID is not set');
            return res.status(500).json({ 
                error: 'Configuration error',
                details: 'GOOGLE_CLIENT_ID is not set'
            });
        }

        const { credential } = req.body;
        if (!credential) {
            console.error('No credential provided in test request');
            return res.status(400).json({ 
                error: 'No credential provided',
                details: 'Please provide a valid Google credential'
            });
        }

        // Check if the credential looks like a Client ID instead of a token
        if (credential.includes('apps.googleusercontent.com')) {
            return res.status(400).json({
                error: 'Invalid credential format',
                details: 'You provided a Client ID instead of a Google token. Please sign in through the website to get a valid token.'
            });
        }

        console.log('Initializing Google OAuth client...');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        
        console.log('Testing token verification...');
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        console.log('Token verification successful');
        
        return res.json({
            success: true,
            clientId: process.env.GOOGLE_CLIENT_ID,
            payload: {
                email: payload.email,
                name: payload.name,
                sub: payload.sub,
                email_verified: payload.email_verified,
                aud: payload.aud,
                iss: payload.iss,
                exp: payload.exp
            }
        });
    } catch (error) {
        console.error('Token verification test error:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            code: error.code
        });
        
        return res.status(400).json({
            success: false,
            error: error.message,
            details: {
                name: error.name,
                code: error.code,
                clientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set'
            }
        });
    }
});

module.exports = router; 