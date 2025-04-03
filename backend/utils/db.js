const mongoose = require('mongoose');

const connectWithRetry = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority'
        });
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Database connection failed, retrying in 5 seconds:', error);
        setTimeout(connectWithRetry, 5000);
    }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('Mongoose connection closed through app termination');
    process.exit(0);
});

// Export connection function and check
module.exports = {
    connectWithRetry,
    isConnected: () => mongoose.connection.readyState === 1
}; 