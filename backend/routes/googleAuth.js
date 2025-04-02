const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/', async (req, res) => {
    try {
        console.log('Received Google auth request:', req.body);
        const { credential } = req.body;

        if (!credential) {
            console.error('No credential provided in request');
            return res.status(400).json({ message: 'No credential provided' });
        }

        if (!process.env.GOOGLE_CLIENT_ID) {
            console.error('GOOGLE_CLIENT_ID is not set');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        // Verify the Google token
        console.log('Verifying Google token with client ID:', process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        console.log('Token verified successfully for user:', payload.email);
        
        // Check if user exists
        let user = await User.findOne({ email: payload.email });

        if (!user) {
            console.log('Creating new user for:', payload.email);
            // Create new user if doesn't exist
            user = new User({
                email: payload.email,
                username: payload.email.split('@')[0], // Use email prefix as username
                fullName: payload.name,
                isVerified: true, // Google users are pre-verified
                googleId: payload.sub
            });

            await user.save();
            console.log('New user created successfully');
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('Authentication successful for user:', user.email);
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
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Authentication failed', 
            error: error.message,
            details: error.stack
        });
    }
});

module.exports = router; 