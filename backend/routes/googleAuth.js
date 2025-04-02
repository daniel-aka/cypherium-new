const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/', async (req, res) => {
    try {
        const { credential } = req.body;
        
        if (!credential) {
            return res.status(400).json({ message: 'No credential provided' });
        }

        // Set timeout for Google verification
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Google verification timeout')), 5000);
        });

        // Verify the Google token with timeout
        const verificationPromise = client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const ticket = await Promise.race([verificationPromise, timeoutPromise]);
        const payload = ticket.getPayload();
        
        // Check if user exists with timeout
        const userPromise = User.findOne({ email: payload.email });
        const userTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Database query timeout')), 5000);
        });

        let user = await Promise.race([userPromise, userTimeoutPromise]);

        if (!user) {
            // Create new user if doesn't exist
            user = new User({
                email: payload.email,
                username: payload.email.split('@')[0],
                fullName: payload.name,
                isVerified: true,
                googleId: payload.sub
            });

            const savePromise = user.save();
            const saveTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('User creation timeout')), 5000);
            });

            await Promise.race([savePromise, saveTimeoutPromise]);
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
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
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        console.error('Google auth error:', error);
        
        // Handle specific timeout errors
        if (error.message.includes('timeout')) {
            return res.status(504).json({ 
                message: 'Request timeout',
                error: error.message 
            });
        }
        
        // Handle other errors
        res.status(500).json({ 
            message: 'Authentication failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router; 