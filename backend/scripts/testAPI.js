const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2N2U3MDlkNDI3NjNmNGFkNjljMzcyMjMiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDMxOTczNTYsImV4cCI6MTc0NTc4OTM1Nn0.jRAhkuumkLI-XLdR02t6GD6m7BimYcx8Cq77lkf9gjA';

const headers = {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
};

async function testAPI() {
    try {
        // 1. Test admin authentication
        console.log('\n1. Testing admin authentication...');
        const authResponse = await axios.get(`${API_URL}/user/profile`, { headers });
        console.log('✓ Admin authentication successful');
        console.log('Admin user:', authResponse.data);

        // 2. Test investment creation
        console.log('\n2. Testing investment creation...');
        const investmentData = {
            planType: 'basic',
            amount: 1000,
            chatSessionId: 'test_chat_session'
        };
        const investmentResponse = await axios.post(
            `${API_URL}/investments`,
            investmentData,
            { headers }
        );
        console.log('✓ Investment creation successful');
        console.log('Created investment:', investmentResponse.data);

        // Store the investment ID for verification
        const investmentId = investmentResponse.data.investment._id;

        // 3. Test investment verification
        console.log('\n3. Testing investment verification...');
        const verifyData = {
            investmentId,
            chatSessionId: 'test_chat_session',
            verifiedBy: 'admin@cypherium.co'
        };
        const verifyResponse = await axios.post(
            `${API_URL}/investments/verify`,
            verifyData,
            { headers }
        );
        console.log('✓ Investment verification successful');
        console.log('Verification result:', verifyResponse.data);

        // 4. Test daily earnings processing
        console.log('\n4. Testing daily earnings processing...');
        const earningsResponse = await axios.post(
            `${API_URL}/investments/process-earnings`,
            {},
            { headers }
        );
        console.log('✓ Daily earnings processing successful');
        console.log('Processing result:', earningsResponse.data);

        // 5. Test investment statistics
        console.log('\n5. Testing investment statistics...');
        const statsResponse = await axios.get(
            `${API_URL}/investments/stats`,
            { headers }
        );
        console.log('✓ Investment statistics retrieval successful');
        console.log('Statistics:', statsResponse.data);

        // 6. Test user dashboard data
        console.log('\n6. Testing user dashboard data...');
        const [balanceResponse, investmentsResponse] = await Promise.all([
            axios.get(`${API_URL}/user/balance`, { headers }),
            axios.get(`${API_URL}/investments/my-investments`, { headers })
        ]);
        console.log('✓ User dashboard data retrieval successful');
        console.log('Balance:', balanceResponse.data);
        console.log('Investments:', investmentsResponse.data);

    } catch (error) {
        console.error('API test failed:', error.response?.data || error.message);
    }
}

testAPI(); 