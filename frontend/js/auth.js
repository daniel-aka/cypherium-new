document.addEventListener('DOMContentLoaded', function() {
    // Password toggle functionality
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('bi-eye-slash');
            this.querySelector('i').classList.toggle('bi-eye');
        });
    }

    // Login form submission
    const loginForm = document.querySelector('.auth-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const code = document.getElementById('code').value;

            // Basic validation
            if (!email || !password || !code) {
                alert('Please fill all fields');
                return;
            }

            try {
                // Show loading state
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
                submitBtn.disabled = true;

                const response = await fetch('http://localhost:5000/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        password,
                        code
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // Store token and redirect
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userId', data.userId);
                    window.location.href = 'dashboard.html'; // Redirect to dashboard
                } else {
                    alert(data.error || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login');
            } finally {
                // Reset button state
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // Code display functionality (from codeGenerator.js)
    const codeDisplay = document.getElementById('code-display');
    if (codeDisplay) {
        const generateRandomCode = () => Math.floor(100000 + Math.random() * 900000).toString();
        let currentCode = generateRandomCode();
        
        codeDisplay.textContent = currentCode;
        codeDisplay.style.cursor = 'pointer';
        codeDisplay.title = 'Click to copy';
        
        codeDisplay.addEventListener('click', function() {
            navigator.clipboard.writeText(currentCode);
            const originalText = this.textContent;
            this.textContent = 'Copied!';
            setTimeout(() => this.textContent = originalText, 2000);
        });
    }
});