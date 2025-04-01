const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Verify user's secret answer
router.post('/verify-secret', async (req, res) => {
    try {
        const { email, secretAnswer } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.secretAnswer !== secretAnswer) {
            return res.status(401).json({ message: 'Invalid secret answer' });
        }

        res.json({ message: 'Verification successful' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify user email
router.post('/verify-email', async (req, res) => {
    try {
        const { email, verificationCode } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // In a real application, you would verify the code against a stored code
        // For now, we'll just mark the user as verified
        user.isVerified = true;
        await user.save();

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying email', error: error.message });
    }
});

// Resend verification code
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // In a real application, you would generate and send a new verification code
        res.json({ message: 'Verification code resent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error resending verification code', error: error.message });
    }
});

module.exports = router; 