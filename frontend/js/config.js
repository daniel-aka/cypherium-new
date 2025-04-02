const config = {
    // Frontend URL
    frontendUrl: window.location.origin,
    
    // Backend URL - ensure it matches the server port
    backendUrl: window.location.hostname === 'localhost' 
        ? 'http://localhost:5500'  // Local development
        : 'https://cypherium.vercel.app',  // Production
    
    // Google OAuth client ID
    googleClientId: '699579419882-cpqhtjm1kjl3uaonlhvd8l9t9e6f91np.apps.googleusercontent.com',
    
    // Google OAuth configuration
    googleConfig: {
        client_id: '699579419882-cpqhtjm1kjl3uaonlhvd8l9t9e6f91np.apps.googleusercontent.com',
        callback: 'handleGoogleSignIn',
        auto_prompt: false,
        context: 'signin',
        ux_mode: 'popup',
        login_uri: window.location.hostname === 'localhost' 
            ? 'http://localhost:5500/api/auth/google/callback'
            : 'https://cypherium.vercel.app/api/auth/google/callback',
        redirect_uri: window.location.hostname === 'localhost'
            ? 'http://localhost:5500'
            : 'https://cypherium.vercel.app'
    }
};

// Initialize Google Sign-In when the script loads
window.onload = function() {
    if (window.google) {
        google.accounts.id.initialize({
            client_id: config.googleClientId,
            callback: handleGoogleSignIn,
            auto_prompt: false,
            context: 'signin',
            ux_mode: 'popup',
            login_uri: config.googleConfig.login_uri,
            redirect_uri: config.googleConfig.redirect_uri
        });
    }
};

// Export the config object
window.config = config; 