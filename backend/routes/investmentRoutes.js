const express = require('express');
const router = express.Router();
const investmentController = require('../controllers/investmentController');
const auth = require('../middleware/auth');

// Create new investment
router.post('/', auth, investmentController.createInvestment);

// Get user's investments
router.get('/my-investments', auth, investmentController.getUserInvestments);

// Verify investment through chat (protected, only for admin/agents)
router.post('/verify', auth, investmentController.verifyInvestment);

// Process daily earnings (protected, only for admin)
router.post('/process-earnings', auth, investmentController.processDailyEarnings);

// Get investment statistics (protected, only for admin)
router.get('/stats', auth, investmentController.getInvestmentStats);

module.exports = router; 