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
        console.log('Starting user authentication for:', payload.email);
        
        // Find or create user with timeout
        console.log('Looking up user in database...');
        const user = await Promise.race([
            User.findOne({ email: payload.email }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database query timeout')), 3000)
            )
        ]);

        console.log('User lookup result:', user ? 'found' : 'not found');

        if (!user) {
            console.log('Creating new user...');
            
            // Generate a unique username
            const baseUsername = payload.email.split('@')[0];
            let username = baseUsername;
            let usernameExists = true;
            let attempts = 0;
            
            // Try to find a unique username
            while (usernameExists && attempts < 5) {
                try {
                    const existingUser = await User.findOne({ username });
                    if (!existingUser) {
                        usernameExists = false;
                    } else {
                        username = `${baseUsername}${Math.floor(Math.random() * 1000)}`;
                        attempts++;
                    }
                } catch (error) {
                    console.error('Error checking username:', error);
                    throw new Error('Failed to check username availability');
                }
            }
            
            if (usernameExists) {
                throw new Error('Could not generate a unique username');
            }

            // Create new user with minimal fields
            const newUser = new User({
                email: payload.email,
                username: username,
                fullName: payload.name,
                isVerified: true,
                googleId: payload.sub,
                balance: 0,
                totalInvested: 0,
                totalEarnings: 0,
                role: 'user'
            });

            try {
                await Promise.race([
                    newUser.save(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('User creation timeout')), 3000)
                    )
                ]);
                console.log('New user created successfully');
            } catch (saveError) {
                console.error('Error saving new user:', saveError);
                if (saveError.code === 11000) { // MongoDB duplicate key error
                    throw new Error('User with this email or username already exists');
                }
                throw new Error(`Failed to create user: ${saveError.message}`);
            }
        }

        console.log('Generating JWT token...');
        // Generate minimal JWT token
        const token = jwt.sign(
            { userId: user?._id || newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        console.log('JWT token generated');

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
        console.error('User auth error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        const elapsedTime = Date.now() - startTime;
        console.log(`Request failed after ${elapsedTime}ms`);
        
        // Return more detailed error information in development
        return res.status(500).json({ 
            message: 'User authentication failed',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                type: error.name,
                stack: error.stack
            } : undefined,
            elapsedTime
        });
    }
}

module.exports = router; 