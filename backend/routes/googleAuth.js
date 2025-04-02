const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

// Initialize OAuth2Client with environment variables
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Cache for storing verified tokens
const tokenCache = new Map();

// Set timeout for Google API calls
const GOOGLE_TIMEOUT = 5000; // 5 seconds

// Handle Google OAuth callback
router.get('/callback', (req, res) => {
    res.send(`
        <script>
            window.opener.postMessage({ type: 'google-auth-callback', success: true }, '*');
            window.close();
        </script>
    `);
});

// Handle Google OAuth token verification
router.post('/', async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: 'No credential provided' });
        }

        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(500).json({ message: 'Server configuration error' });
        }

        // Check cache first
        if (tokenCache.has(credential)) {
            const cachedData = tokenCache.get(credential);
            return res.json(cachedData);
        }

        // Set timeout for the entire operation
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Operation timed out')), GOOGLE_TIMEOUT);
        });

        // Verify the Google token with timeout
        const verificationPromise = client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const ticket = await Promise.race([verificationPromise, timeoutPromise]);
        const payload = ticket.getPayload();
        
        // Find or create user with timeout
        const userPromise = User.findOne({ email: payload.email });
        let user = await Promise.race([userPromise, timeoutPromise]);

        if (!user) {
            user = new User({
                email: payload.email,
                username: payload.email.split('@')[0],
                fullName: payload.name,
                isVerified: true,
                googleId: payload.sub
            });
            await Promise.race([user.save(), timeoutPromise]);
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const responseData = {
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                fullName: user.fullName,
                isVerified: user.isVerified
            }
        };

        // Cache the response
        tokenCache.set(credential, responseData);
        // Remove from cache after 5 minutes
        setTimeout(() => tokenCache.delete(credential), 5 * 60 * 1000);

        res.json(responseData);
    } catch (error) {
        console.error('Google auth error:', error);
        if (error.message === 'Operation timed out') {
            return res.status(504).json({ 
                message: 'Authentication timed out', 
                error: 'Request took too long to process'
            });
        }
        res.status(500).json({ 
            message: 'Authentication failed', 
            error: error.message
        });
    }
});

module.exports = router; 