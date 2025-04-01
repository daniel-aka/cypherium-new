const cron = require('node-cron');
const axios = require('axios');
const logger = require('../utils/logger');

// Process daily earnings at midnight every day
const processDailyEarnings = async () => {
    try {
        const response = await axios.post('http://localhost:3000/api/investments/process-earnings', {}, {
            headers: {
                'Authorization': `Bearer ${process.env.ADMIN_TOKEN}` // You'll need to set this in your .env file
            }
        });

        logger.info('Daily earnings processed successfully', {
            timestamp: new Date(),
            response: response.data
        });
    } catch (error) {
        logger.error('Error processing daily earnings', {
            timestamp: new Date(),
            error: error.message,
            stack: error.stack
        });
    }
};

// Schedule the cron job
const startEarningsCron = () => {
    // Run at midnight every day
    cron.schedule('0 0 * * *', processDailyEarnings);
    
    logger.info('Daily earnings cron job scheduled', {
        timestamp: new Date(),
        schedule: '0 0 * * *'
    });
};

module.exports = startEarningsCron; 