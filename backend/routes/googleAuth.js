const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

// Initialize OAuth2Client with environment variables
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Cache for storing verified tokens
const tokenCache = new Map();

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

        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        
        // Find or create user
        let user = await User.findOne({ email: payload.email });

        if (!user) {
            user = new User({
                email: payload.email,
                username: payload.email.split('@')[0],
                fullName: payload.name,
                isVerified: true,
                googleId: payload.sub
            });
            await user.save();
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
        res.status(500).json({ 
            message: 'Authentication failed', 
            error: error.message
        });
    }
});

module.exports = router; 