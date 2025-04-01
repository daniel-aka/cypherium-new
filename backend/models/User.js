const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: function() {
            return !this.googleId; // Password is required only for non-Google users
        },
        select: false
    },
    fullName: {
        type: String,
        required: true
    },
    balance: {
        type: Number,
        default: 0
    },
    totalInvested: {
        type: Number,
        default: 0
    },
    totalEarnings: {
        type: Number,
        default: 0
    },
    referralCode: {
        type: String,
        unique: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    referralEarnings: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        enum: ['user', 'agent', 'admin'],
        default: 'user'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    secretQuestion: {
        type: String,
        enum: ['mother_maiden', 'first_pet', 'birth_city', 'school_name']
    },
    secretAnswer: {
        type: String
    },
    transactions: [transactionSchema],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password') && this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Generate unique referral code
userSchema.pre('save', async function(next) {
    if (!this.referralCode) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.referralCode = code;
    }
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to update balance
userSchema.methods.updateBalance = async function(amount, type, reason) {
    const balanceChange = type === 'add' ? amount : -amount;
    this.balance += balanceChange;
    
    this.transactions.push({
        type: type === 'add' ? 'credit' : 'debit',
        amount: Math.abs(amount),
        reason: reason || 'Admin adjustment',
        date: new Date()
    });

    return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('User', userSchema);