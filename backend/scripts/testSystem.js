require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

const API_URL = 'http://localhost:5000/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function testSystem() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Test Admin Token Authentication
        console.log('\n1. Testing Admin Token Authentication...');
        try {
            const authResponse = await axios.get(`${API_URL}/user/profile`, {
                headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
            });
            console.log('✓ Admin authentication successful');
            console.log('Admin user:', authResponse.data);
        } catch (error) {
            console.error('✗ Admin authentication failed:', error.response?.data || error.message);
        }

        // 2. Test Investment Creation
        console.log('\n2. Testing Investment Creation...');
        try {
            const investmentData = {
                planType: 'basic',
                amount: 1000,
                chatSessionId: 'test_chat_session'
            };
            const investmentResponse = await axios.post(
                `${API_URL}/investments`,
                investmentData,
                { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
            );
            console.log('✓ Investment creation successful');
            console.log('Created investment:', investmentResponse.data);

            // Store the investment ID for verification
            const investmentId = investmentResponse.data.investment._id;

            // 3. Test Investment Verification
            console.log('\n3. Testing Investment Verification...');
            try {
                const verifyData = {
                    investmentId,
                    chatSessionId: 'test_chat_session',
                    verifiedBy: 'admin@cypherium.co'
                };
                const verifyResponse = await axios.post(
                    `${API_URL}/investments/verify`,
                    verifyData,
                    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
                );
                console.log('✓ Investment verification successful');
                console.log('Verification result:', verifyResponse.data);
            } catch (error) {
                console.error('✗ Investment verification failed:', error.response?.data || error.message);
            }
        } catch (error) {
            console.error('✗ Investment creation failed:', error.response?.data || error.message);
        }

        // 4. Test Daily Earnings Processing
        console.log('\n4. Testing Daily Earnings Processing...');
        try {
            const earningsResponse = await axios.post(
                `${API_URL}/investments/process-earnings`,
                {},
                { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
            );
            console.log('✓ Daily earnings processing successful');
            console.log('Processing result:', earningsResponse.data);
        } catch (error) {
            console.error('✗ Daily earnings processing failed:', error.response?.data || error.message);
        }

        // 5. Test Investment Statistics
        console.log('\n5. Testing Investment Statistics...');
        try {
            const statsResponse = await axios.get(
                `${API_URL}/investments/stats`,
                { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
            );
            console.log('✓ Investment statistics retrieval successful');
            console.log('Statistics:', statsResponse.data);
        } catch (error) {
            console.error('✗ Investment statistics retrieval failed:', error.response?.data || error.message);
        }

        // 6. Test User Dashboard Data
        console.log('\n6. Testing User Dashboard Data...');
        try {
            const [balanceResponse, investmentsResponse] = await Promise.all([
                axios.get(`${API_URL}/user/balance`, {
                    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
                }),
                axios.get(`${API_URL}/investments/my-investments`, {
                    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
                })
            ]);
            console.log('✓ User dashboard data retrieval successful');
            console.log('Balance:', balanceResponse.data);
            console.log('Investments:', investmentsResponse.data);
        } catch (error) {
            console.error('✗ User dashboard data retrieval failed:', error.response?.data || error.message);
        }

    } catch (error) {
        console.error('System test failed:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

testSystem(); 