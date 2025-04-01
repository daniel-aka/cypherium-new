const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Admin login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Hardcoded admin credentials for testing
        if (username === 'admin' && password === 'admin123') {
            // Generate JWT token
            const token = jwt.sign(
                { adminId: 'admin', role: 'admin' },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            res.json({
                token,
                admin: {
                    id: 'admin',
                    username: 'admin'
                }
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get admin profile (without database)
router.get('/profile', (req, res) => {
    res.json({
        id: 'admin',
        username: 'admin',
        role: 'admin'
    });
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user balance
router.post('/users/:userId/balance', async (req, res) => {
    try {
        const { amount, type, reason } = req.body;
        const userId = req.params.userId;

        if (type !== 'add' && type !== 'subtract') {
            return res.status(400).json({ message: 'Invalid operation type' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.updateBalance(amount, type, reason);

        res.json({
            message: 'Balance updated successfully',
            newBalance: user.balance,
            transaction: user.transactions[user.transactions.length - 1]
        });
    } catch (error) {
        console.error('Error updating balance:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user details
router.get('/users/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId, '-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 