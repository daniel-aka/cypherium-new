const express = require('express');
const router = express.Router();
const { isConnected } = require('../utils/db');

router.get('/health', async (req, res) => {
    const dbStatus = isConnected() ? 'OK' : 'DOWN';
    const status = dbStatus === 'OK' ? 200 : 503;
    
    res.status(status).json({
        status: dbStatus,
        database: {
            status: dbStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        },
        environment: process.env.NODE_ENV
    });
});

module.exports = router; 