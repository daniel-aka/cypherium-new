require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

async function generateAdminToken() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.log('No admin user found');
            return;
        }

        const token = jwt.sign(
            { 
                userId: adminUser._id,
                role: 'admin'
            },
            process.env.JWT_SECRET + '_admin',
            { expiresIn: '30d' }
        );

        console.log('Generated Admin Token:');
        console.log(token);
        console.log('\nAdd this token to your .env file as:');
        console.log(`ADMIN_TOKEN=${token}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

generateAdminToken(); 