const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    planType: {
        type: String,
        enum: ['basic', 'premium', 'vip'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    dailyReturn: {
        type: Number,
        required: true,
        default: function() {
            const planRates = {
                basic: 0.01,    // 1% daily
                premium: 0.02,  // 2% daily
                vip: 0.03      // 3% daily
            };
            return this.amount * planRates[this.planType];
        }
    },
    totalReturn: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'cancelled'],
        default: 'pending'
    },
    startDate: {
        type: Date
    },
    lastEarningDate: {
        type: Date
    },
    chatSessionId: {
        type: String
    },
    verifiedBy: {
        type: String
    },
    verificationDate: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Investment', investmentSchema); 