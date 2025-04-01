const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/', async (req, res) => {
    try {
        const { credential } = req.body;

        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        
        // Check if user exists
        let user = await User.findOne({ email: payload.email });

        if (!user) {
            // Create new user if doesn't exist
            user = new User({
                email: payload.email,
                username: payload.email.split('@')[0], // Use email prefix as username
                fullName: payload.name,
                isVerified: true, // Google users are pre-verified
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
        res.status(500).json({ message: 'Authentication failed', error: error.message });
    }
});

module.exports = router; 