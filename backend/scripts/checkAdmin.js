require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) {
            console.log('Admin user found:');
            console.log('ID:', adminUser._id);
            console.log('Email:', adminUser.email);
            console.log('Username:', adminUser.username);
            console.log('Role:', adminUser.role);
        } else {
            console.log('No admin user found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

checkAdmin(); 