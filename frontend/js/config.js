// Configuration object
const config = {
    // Frontend URL
    frontendUrl: window.location.origin,
    
    // Backend URL - ensure it matches the server port
    backendUrl: window.location.hostname === 'localhost' 
        ? 'http://localhost:5003'  // Backend server port
        : 'https://cypherium.vercel.app',  // Use the same domain as frontend
    
    // Google OAuth client ID - should match the one in your Google Cloud Console
    googleClientId: '699579419882-cpqhtjm1kjl3uaonlhvd8l9t9e6f91np.apps.googleusercontent.com'
};

// Validate configuration
if (!config.googleClientId) {
    console.error('Google Client ID is not configured. Please check your configuration.');
}

// Export the config object
window.config = config; 