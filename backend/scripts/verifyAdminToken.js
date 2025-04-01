require('dotenv').config();
const jwt = require('jsonwebtoken');

function verifyAdminToken() {
    try {
        const adminToken = process.env.ADMIN_TOKEN;
        if (!adminToken) {
            console.error('No ADMIN_TOKEN found in .env file');
            return;
        }

        // Verify the token using the admin-specific secret
        const adminSecret = process.env.JWT_SECRET + '_admin';
        const decoded = jwt.verify(adminToken, adminSecret);

        console.log('Token verification successful!');
        console.log('\nDecoded token information:');
        console.log('User ID:', decoded.userId);
        console.log('Role:', decoded.role);
        console.log('Issued at:', new Date(decoded.iat * 1000).toLocaleString());
        console.log('Expires at:', new Date(decoded.exp * 1000).toLocaleString());

    } catch (error) {
        console.error('Token verification failed:', error.message);
    }
}

verifyAdminToken(); 