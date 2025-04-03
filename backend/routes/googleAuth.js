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
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        
        if (!credential) {
            return res.status(400).json({
                error: 'Missing credential',
                message: 'Google authentication token is required'
            });
        }

        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create new user
            user = new User({
                email,
                username: email.split('@')[0],
                fullName: name,
                profilePicture: picture,
                isVerified: true
            });
            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                fullName: user.fullName,
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        console.error('Google auth error:', error);
        
        // Handle specific error types
        if (error.message.includes('Token used too late')) {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Google authentication token has expired'
            });
        }
        
        if (error.message.includes('Invalid token signature')) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Invalid Google authentication token'
            });
        }

        res.status(500).json({
            error: 'Authentication failed',
            message: 'An error occurred during Google authentication'
        });
    }
});

// Google OAuth callback endpoint
router.get('/callback', async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!code) {
            return res.status(400).json({
                error: 'Missing code',
                message: 'Authorization code is required'
            });
        }

        const { tokens } = await client.getToken({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI
        });

        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create new user
            user = new User({
                email,
                username: email.split('@')[0],
                fullName: name,
                profilePicture: picture,
                isVerified: true
            });
            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Redirect to frontend with token
        res.redirect(`${process.env.GOOGLE_CALLBACK_URL}?token=${token}`);
    } catch (error) {
        console.error('Google callback error:', error);
        res.redirect(`${process.env.GOOGLE_CALLBACK_URL}?error=${encodeURIComponent(error.message)}`);
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