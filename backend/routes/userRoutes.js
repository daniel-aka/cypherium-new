const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user profile' });
    }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { username, email, fullName } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { username, email, fullName } },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user profile' });
    }
});

// Get user's balance and investment summary
router.get('/balance', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('balance totalInvested totalEarnings');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user balance' });
    }
});

// Admin: Get all users
router.get('/all', auth, roles(['admin']), async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});

module.exports = router; 