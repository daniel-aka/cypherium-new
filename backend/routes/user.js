const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Mock user data
const mockUser = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    balance: 1000,
    transactions: []
};

// Get user profile
router.get('/profile', (req, res) => {
    res.json(mockUser);
});

// Update user balance
router.post('/balance', (req, res) => {
    const { amount, type } = req.body;
    
    if (type !== 'add' && type !== 'subtract') {
        return res.status(400).json({ message: 'Invalid operation type' });
    }

    // Mock balance update
    mockUser.balance += type === 'add' ? amount : -amount;
    
    // Add transaction to history
    mockUser.transactions.push({
        type: type === 'add' ? 'deposit' : 'withdrawal',
        amount,
        balance: mockUser.balance,
        date: new Date()
    });

    res.json({ 
        message: 'Balance updated successfully',
        newBalance: mockUser.balance
    });
});

// Get transaction history
router.get('/transactions', (req, res) => {
    res.json(mockUser.transactions);
});

module.exports = router; 