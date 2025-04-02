const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/', async (req, res) => {
    console.log('Google auth request received');
    const startTime = Date.now();
    
    try {
        const { credential } = req.body;
        console.log('Request body received:', { hasCredential: !!credential });
        
        if (!credential) {
            console.log('No credential provided');
            return res.status(400).json({ message: 'No credential provided' });
        }

        // Set timeout for Google verification
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                console.log('Google verification timeout after 5 seconds');
                reject(new Error('Google verification timeout'));
            }, 5000);
        });

        console.log('Starting Google token verification');
        const verificationStart = Date.now();
        
        // Verify the Google token with timeout
        const verificationPromise = client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const ticket = await Promise.race([verificationPromise, timeoutPromise]);
        console.log(`Google verification completed in ${Date.now() - verificationStart}ms`);
        
        const payload = ticket.getPayload();
        console.log('Google payload received:', { email: payload.email });
        
        // Check if user exists with timeout
        console.log('Checking for existing user');
        const userStart = Date.now();
        
        const userPromise = User.findOne({ email: payload.email });
        const userTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                console.log('Database query timeout after 5 seconds');
                reject(new Error('Database query timeout'));
            }, 5000);
        });

        let user = await Promise.race([userPromise, userTimeoutPromise]);
        console.log(`User lookup completed in ${Date.now() - userStart}ms`);

        if (!user) {
            console.log('Creating new user');
            const createStart = Date.now();
            
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
                setTimeout(() => {
                    console.log('User creation timeout after 5 seconds');
                    reject(new Error('User creation timeout'));
                }, 5000);
            });

            await Promise.race([savePromise, saveTimeoutPromise]);
            console.log(`User creation completed in ${Date.now() - createStart}ms`);
        }

        console.log('Generating JWT token');
        const tokenStart = Date.now();
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log(`Token generation completed in ${Date.now() - tokenStart}ms`);
        console.log(`Total request time: ${Date.now() - startTime}ms`);

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
        console.log(`Total request time before error: ${Date.now() - startTime}ms`);
        
        // Handle specific timeout errors
        if (error.message.includes('timeout')) {
            return res.status(504).json({ 
                message: 'Request timeout',
                error: error.message,
                timestamp: Date.now()
            });
        }
        
        // Handle other errors
        res.status(500).json({ 
            message: 'Authentication failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: Date.now()
        });
    }
});

module.exports = router; 