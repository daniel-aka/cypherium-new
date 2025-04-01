const Investment = require('../models/Investment');
const User = require('../models/User');

// Create new investment
exports.createInvestment = async (req, res) => {
    try {
        const { planType, amount } = req.body;
        const userId = req.user._id;

        // Validate plan type
        if (!['basic', 'premium', 'vip'].includes(planType)) {
            return res.status(400).json({ message: 'Invalid plan type' });
        }

        // Create new investment
        const investment = new Investment({
            userId,
            planType,
            amount,
            chatSessionId: req.body.chatSessionId // Optional, for Tawk.to integration
        });

        await investment.save();

        res.status(201).json({
            message: 'Investment created successfully',
            investment
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating investment', error: error.message });
    }
};

// Get user's investments
exports.getUserInvestments = async (req, res) => {
    try {
        const investments = await Investment.find({ userId: req.user._id })
            .sort({ createdAt: -1 });

        res.json(investments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching investments', error: error.message });
    }
};

// Verify investment through chat
exports.verifyInvestment = async (req, res) => {
    try {
        const { investmentId, chatSessionId, verifiedBy } = req.body;

        const investment = await Investment.findById(investmentId);
        if (!investment) {
            return res.status(404).json({ message: 'Investment not found' });
        }

        // Update investment status
        investment.status = 'active';
        investment.startDate = new Date();
        investment.lastEarningDate = new Date();
        investment.verifiedBy = verifiedBy;
        investment.verificationDate = new Date();
        investment.chatSessionId = chatSessionId;

        await investment.save();

        // Update user's total invested amount
        await User.findByIdAndUpdate(
            investment.userId,
            { $inc: { totalInvested: investment.amount } }
        );

        res.json({
            message: 'Investment verified successfully',
            investment
        });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying investment', error: error.message });
    }
};

// Process daily earnings
exports.processDailyEarnings = async (req, res) => {
    try {
        const activeInvestments = await Investment.find({ status: 'active' });
        const now = new Date();

        for (const investment of activeInvestments) {
            const lastEarning = new Date(investment.lastEarningDate);
            const daysSinceLastEarning = Math.floor((now - lastEarning) / (1000 * 60 * 60 * 24));

            if (daysSinceLastEarning >= 1) {
                // Calculate earnings
                const earnings = investment.dailyReturn * daysSinceLastEarning;
                investment.totalReturn += earnings;
                investment.lastEarningDate = now;

                // Update user's balance and total earnings
                await User.findByIdAndUpdate(
                    investment.userId,
                    {
                        $inc: {
                            balance: earnings,
                            totalEarnings: earnings
                        }
                    }
                );

                await investment.save();
            }
        }

        res.json({ message: 'Daily earnings processed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error processing daily earnings', error: error.message });
    }
};

// Get investment statistics
exports.getInvestmentStats = async (req, res) => {
    try {
        const stats = await Investment.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    totalReturn: { $sum: '$totalReturn' }
                }
            }
        ]);

        const totalUsers = await User.countDocuments();
        const totalInvestors = await Investment.distinct('userId').then(ids => ids.length);

        res.json({
            stats,
            totalUsers,
            totalInvestors
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching investment statistics', error: error.message });
    }
}; 