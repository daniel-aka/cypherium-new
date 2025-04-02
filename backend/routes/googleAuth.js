const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

// Google OAuth2 client with timeout
const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Set timeout for Google verification
oauth2Client.setTimeout(3000);

// Cache for verified tokens
const tokenCache = new Map();

// Helper function to handle user authentication
async function handleUserAuth(payload) {
    try {
        console.log('Starting user authentication for:', payload.email);
        
        // Lookup user with timeout
        const user = await Promise.race([
            User.findOne({ email: payload.email }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('User lookup timeout')), 5000)
            )
        ]);

        if (user) {
            console.log('Existing user found:', user.email);
            return user;
        }

        console.log('Creating new user for:', payload.email);
        const newUser = new User({
            email: payload.email,
            name: payload.name,
            googleId: payload.sub,
            profilePicture: payload.picture
        });

        await newUser.save();
        console.log('New user created successfully');
        return newUser;
    } catch (error) {
        console.error('User authentication error:', error);
        throw error;
    }
}

// Google Sign-In endpoint
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        
        if (!credential) {
            return res.status(400).json({ error: 'No credential provided' });
        }

        // Check token cache
        if (tokenCache.has(credential)) {
            console.log('Using cached token');
            return res.json(tokenCache.get(credential));
        }

        console.log('Verifying Google token');
        const ticket = await oauth2Client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        console.log('Token verified for:', payload.email);

        const user = await handleUserAuth(payload);
        
        // Cache the token result
        tokenCache.set(credential, { user });
        
        res.json({ user });
    } catch (error) {
        console.error('Google authentication error:', error);
        
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
        
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Test endpoint for token verification
router.post('/test', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ message: 'No credential provided' });
        }

        console.log('Testing token verification...');
        const ticket = await oauth2Client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        return res.json({
            success: true,
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
        console.error('Token verification test error:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? {
                name: error.name,
                code: error.code,
                stack: error.stack
            } : undefined
        });
    }
});

module.exports = router; 