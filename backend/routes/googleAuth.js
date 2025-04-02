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
        
        // Find or create user with timeout
        const userPromise = User.findOne({ email: payload.email });
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('User lookup timeout')), 3000)
        );
        
        let user = await Promise.race([userPromise, timeoutPromise]);
        
        if (!user) {
            console.log('Creating new user for:', payload.email);
            // Create new user with timeout
            const createPromise = User.create({
                email: payload.email,
                fullName: payload.name,
                googleId: payload.sub,
                username: payload.email.split('@')[0] + Math.random().toString(36).substring(2, 8)
            });
            user = await Promise.race([createPromise, timeoutPromise]);
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        return {
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                username: user.username
            }
        };
    } catch (error) {
        console.error('User authentication error:', error);
        throw error;
    }
}

// Google Sign-In endpoint
router.post('/', async (req, res) => {
    try {
        console.log('Received Google sign-in request');
        const { credential } = req.body;
        
        if (!credential) {
            console.error('No credential provided');
            return res.status(400).json({ error: 'No credential provided' });
        }
        
        // Check cache first
        if (tokenCache.has(credential)) {
            console.log('Using cached token');
            return res.json(tokenCache.get(credential));
        }
        
        // Verify Google token with timeout
        console.log('Verifying Google token...');
        const verifyPromise = oauth2Client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Google token verification timeout')), 3000)
        );
        
        const ticket = await Promise.race([verifyPromise, timeoutPromise]);
        const payload = ticket.getPayload();
        
        console.log('Token verified for:', payload.email);
        
        // Validate token audience
        if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
            console.error('Invalid token audience:', payload.aud);
            return res.status(401).json({ error: 'Invalid token audience' });
        }
        
        // Handle user authentication
        const authResult = await handleUserAuth(payload);
        
        // Cache the result
        tokenCache.set(credential, authResult);
        setTimeout(() => tokenCache.delete(credential), 5 * 60 * 1000); // Clear after 5 minutes
        
        console.log('Authentication successful for:', payload.email);
        res.json(authResult);
        
    } catch (error) {
        console.error('Google authentication error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        if (error.message.includes('timeout')) {
            res.status(504).json({ error: 'Authentication timeout' });
        } else if (error.message.includes('Invalid token')) {
            res.status(401).json({ error: 'Invalid Google token' });
        } else {
            res.status(500).json({ 
                error: 'Authentication failed',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
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