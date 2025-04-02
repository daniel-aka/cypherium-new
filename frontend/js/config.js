const config = {
    // Frontend URL
    frontendUrl: window.location.origin,
    
    // Backend URL - ensure it matches the server port
    backendUrl: window.location.hostname === 'localhost' 
        ? 'http://localhost:5003'  // Backend server port
        : 'https://cypherium.vercel.app',
    
    // Google OAuth client ID
    googleClientId: '699579419882-cpqhtjm1kjl3uaonlhvd8l9t9e6f91np.apps.googleusercontent.com',
    
    // Google OAuth configuration
    googleConfig: {
        client_id: '699579419882-cpqhtjm1kjl3uaonlhvd8l9t9e6f91np.apps.googleusercontent.com',
        callback: 'handleGoogleSignIn',
        auto_prompt: false,
        context: 'signin',
        ux_mode: 'popup',
        login_uri: 'https://cypherium.vercel.app/api/auth/google/callback'
    }
};

// Export the config object
window.config = config; 