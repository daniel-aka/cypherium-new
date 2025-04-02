const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

// Initialize OAuth2Client with timeout
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, null, {
    timeout: 3000 // 3 second timeout for Google verification
});

// Cache for verified tokens
const tokenCache = new Map();

router.post('/', async (req, res) => {
    const startTime = Date.now();
    console.log('Google auth request received');
    
    try {
        const { credential } = req.body;
        
        if (!credential) {
            return res.status(400).json({ message: 'No credential provided' });
        }

        // Check cache first
        if (tokenCache.has(credential)) {
            console.log('Using cached token verification');
            const payload = tokenCache.get(credential);
            return await handleUserAuth(payload, res, startTime);
        }

        // Verify Google token with timeout
        const ticket = await Promise.race([
            client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Google verification timeout')), 3000)
            )
        ]);

        const payload = ticket.getPayload();
        // Cache the verified token
        tokenCache.set(credential, payload);
        
        return await handleUserAuth(payload, res, startTime);
    } catch (error) {
        console.error('Google auth error:', error);
        const elapsedTime = Date.now() - startTime;
        console.log(`Request failed after ${elapsedTime}ms`);
        
        if (error.message.includes('timeout')) {
            return res.status(504).json({ 
                message: 'Request timeout',
                error: error.message,
                elapsedTime
            });
        }
        
        return res.status(500).json({ 
            message: 'Authentication failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            elapsedTime
        });
    }
});

// Helper function to handle user authentication
async function handleUserAuth(payload, res, startTime) {
    try {
        // Find or create user with timeout
        const user = await Promise.race([
            User.findOne({ email: payload.email }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database query timeout')), 3000)
            )
        ]);

        if (!user) {
            // Create new user with minimal fields
            const newUser = new User({
                email: payload.email,
                username: payload.email.split('@')[0],
                fullName: payload.name,
                isVerified: true,
                googleId: payload.sub
            });

            await Promise.race([
                newUser.save(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('User creation timeout')), 3000)
                )
            ]);
        }

        // Generate minimal JWT token
        const token = jwt.sign(
            { userId: user?._id || newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const elapsedTime = Date.now() - startTime;
        console.log(`Request completed in ${elapsedTime}ms`);

        // Return minimal response
        return res.json({
            token,
            user: {
                id: user?._id || newUser._id,
                email: payload.email,
                isVerified: true
            }
        });
    } catch (error) {
        console.error('User auth error:', error);
        const elapsedTime = Date.now() - startTime;
        return res.status(500).json({ 
            message: 'User authentication failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            elapsedTime
        });
    }
}

module.exports = router; 