const api = {
    // Use environment-specific base URL from config
    baseUrl: config.backendUrl,
    
    // Helper function to handle API responses
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            return data;
        }
        throw new Error('Invalid response format');
    },

    // Helper function to get auth headers
    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    },

    // Authentication endpoints
    auth: {
        async login(email, password) {
            try {
                const response = await fetch(`${api.baseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: api.getAuthHeaders(),
                    credentials: 'include',
                    body: JSON.stringify({ email, password })
                });
                const data = await api.handleResponse(response);
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
                return data;
            } catch (error) {
                console.error('Login error:', error);
                throw new Error(error.message || 'Failed to login. Please try again.');
            }
        },

        async register(userData) {
            try {
                const response = await fetch(`${api.baseUrl}/api/auth/register`, {
                    method: 'POST',
                    headers: api.getAuthHeaders(),
                    credentials: 'include',
                    body: JSON.stringify(userData)
                });
                return api.handleResponse(response);
            } catch (error) {
                console.error('Registration error:', error);
                throw new Error(error.message || 'Failed to register. Please try again.');
            }
        },

        async googleSignIn(credential) {
            let lastError = null;
            
            for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
                try {
                    console.log(`Attempting Google sign-in (attempt ${attempt}/${this.retryAttempts})`);
                    
                    const response = await fetch(`${this.baseUrl}/api/auth/google`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ credential }),
                        credentials: 'include'
                    });

                    console.log('Response status:', response.status);
                    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

                    const data = await this.handleResponse(response);
                    
                    if (data.token) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        return data;
                    } else {
                        throw new Error('No token received from server');
                    }
                } catch (error) {
                    console.error(`Google sign-in attempt ${attempt} failed:`, error);
                    lastError = error;
                    
                    if (attempt < this.retryAttempts) {
                        console.log(`Retrying in ${this.retryDelay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                    }
                }
            }

            throw new Error(`Failed to sign in with Google after ${this.retryAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
        },

        async logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        },

        async getCurrentUser() {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${api.baseUrl}/api/auth/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return api.handleResponse(response);
        }
    },

    // User profile endpoints
    user: {
        async updateProfile(userData) {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${api.baseUrl}/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userData)
            });
            return api.handleResponse(response);
        },

        async getProfile() {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${api.baseUrl}/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return api.handleResponse(response);
        }
    },

    // Investment endpoints
    investments: {
        async getInvestments() {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${api.baseUrl}/investments`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return api.handleResponse(response);
        },

        async createInvestment(investmentData) {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${api.baseUrl}/investments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(investmentData)
            });
            return api.handleResponse(response);
        },

        async getTransactions() {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${api.baseUrl}/transactions`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return api.handleResponse(response);
        },

        async deposit(amount) {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${api.baseUrl}/transactions/deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount })
            });
            return api.handleResponse(response);
        },

        async withdraw(amount) {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${api.baseUrl}/transactions/withdraw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount })
            });
            return api.handleResponse(response);
        }
    }
};

// Export the API object
window.api = api; 