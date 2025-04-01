const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No authentication token, access denied' });
        }

        // Check if it's the admin token
        if (token === process.env.ADMIN_TOKEN) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET + '_admin');
            const user = await User.findById(decoded.userId).select('-password');

            if (!user || user.role !== 'admin') {
                return res.status(401).json({ message: 'Invalid admin token' });
            }

            req.user = user;
            req.isAdmin = true;
            return next();
        }

        // Regular user token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ message: 'Token is invalid' });
    }
};

module.exports = auth; 