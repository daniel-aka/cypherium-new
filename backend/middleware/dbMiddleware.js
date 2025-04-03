const { isConnected } = require('../utils/db');

const checkDatabaseConnection = (req, res, next) => {
    if (!isConnected()) {
        return res.status(503).json({
            error: 'Database connection is not ready',
            message: 'Please try again in a few moments'
        });
    }
    next();
};

module.exports = checkDatabaseConnection; 