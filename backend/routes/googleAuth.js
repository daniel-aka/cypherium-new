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
        
        // Check environment variables
        if (!process.env.GOOGLE_CLIENT_ID) {
            console.error('GOOGLE_CLIENT_ID is not set');
            return res.status(500).json({ 
                error: 'Configuration error',
                details: 'GOOGLE_CLIENT_ID is not set'
            });
        }

        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not set');
            return res.status(500).json({ 
                error: 'Configuration error',
                details: 'MONGODB_URI is not set'
            });
        }

        const { credential } = req.body;

        if (!credential) {
            console.error('No credential provided');
            return res.status(400).json({ error: 'No credential provided' });
        }

        // Verify Google token
        console.log('Verifying Google token');
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        console.log('Token verified for:', payload.email);

        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            console.log('Attempting to reconnect to MongoDB...');
            try {
                await mongoose.connect(process.env.MONGODB_URI, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    serverSelectionTimeoutMS: 5000
                });
                console.log('MongoDB connected successfully');
            } catch (error) {
                console.error('Failed to connect to MongoDB:', error);
                return res.status(503).json({ 
                    error: 'Database error',
                    details: 'Failed to connect to database'
                });
            }
        }

        // Find or create user
        let user = await User.findOne({ email: payload.email });
        
        if (!user) {
            console.log('Creating new user for:', payload.email);
            user = new User({
                email: payload.email,
                fullName: payload.name,
                googleId: payload.sub,
                isVerified: payload.email_verified || false
            });
            
            try {
                await user.save();
                console.log('New user created successfully');
            } catch (error) {
                console.error('Error creating user:', error);
                return res.status(500).json({ 
                    error: 'User creation failed',
                    details: error.message
                });
            }
        }

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

        res.json({ 
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            },
            token 
        });
    } catch (error) {
        console.error('Google authentication error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        res.status(500).json({ 
            error: 'Authentication failed',
            details: error.message
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

// Test database connection
router.get('/test-db', async (req, res) => {
    try {
        console.log('Testing MongoDB connection...');
        
        // Check connection state
        const connectionState = mongoose.connection.readyState;
        console.log('MongoDB connection state:', connectionState);
        
        if (connectionState !== 1) {
            console.log('Attempting to connect to MongoDB...');
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000
            });
            console.log('MongoDB connected successfully');
        }

        // Try a simple query
        const userCount = await User.countDocuments();
        console.log('User count:', userCount);

        res.json({
            status: 'success',
            message: 'Database connection successful',
            connectionState: mongoose.connection.readyState,
            userCount
        });
    } catch (error) {
        console.error('Database connection test failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            error: error.message
        });
    }
});

module.exports = router; 