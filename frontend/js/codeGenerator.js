document.addEventListener('DOMContentLoaded', function() {
    // Generate random 6-digit code
    function generateRandomCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Password strength validation
    function validatePassword(password) {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(password);
    }

    // DOM elements
    const codeInput = document.getElementById('code');
    const codeDisplay = document.getElementById('code-display');
    const form = document.querySelector('.auth-form');
    const passwordInput = document.getElementById('password') || document.getElementById('new-password');
    const togglePassword = document.getElementById('togglePassword');
    const passwordError = document.createElement('div');
    passwordError.className = 'invalid-feedback';
    passwordInput.parentNode.appendChild(passwordError);

    let currentCode = generateRandomCode();

    // Initialize code display
    codeDisplay.textContent = currentCode;

    // Real-time code validation
    codeInput.addEventListener('input', function() {
        if (codeInput.value === currentCode) {
            setValid(codeInput, codeDisplay);
        } else {
            resetCodeValidation();
        }
    });

    // Password visibility toggle
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('bi-eye');
            this.querySelector('i').classList.toggle('bi-eye-slash');
        });
    }

    // Real-time password validation
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            if (validatePassword(passwordInput.value)) {
                setValid(passwordInput);
                passwordError.textContent = '';
            } else {
                setInvalid(passwordInput);
                passwordError.textContent = 'Password must contain: 1 uppercase, 1 lowercase, 1 number, 1 symbol';
            }
        });
    }

    // Form submission
    form.addEventListener('submit', function(e) {
        let isValid = true;

        // Validate code
        if (codeInput.value !== currentCode) {
            setInvalid(codeInput, codeDisplay, `Invalid code!`);
            currentCode = generateRandomCode();
            codeDisplay.textContent = currentCode;
            isValid = false;
        }

        // Validate password
        if (passwordInput && !validatePassword(passwordInput.value)) {
            setInvalid(passwordInput);
            passwordError.textContent = 'Fix password requirements before submitting';
            isValid = false;
        }

        if (!isValid) {
            e.preventDefault();
        }
    });

    // Helper functions
    function setValid(element, displayElement = null) {
        element.classList.remove('is-invalid');
        element.classList.add('is-valid');
        if (displayElement) displayElement.classList.add('text-success');
    }

    function setInvalid(element, displayElement = null, message = null) {
        element.classList.remove('is-valid');
        element.classList.add('is-invalid');
        if (displayElement) {
            displayElement.classList.remove('text-success');
            displayElement.classList.add('text-danger');
            if (message) displayElement.innerHTML = `<span class="text-danger">${message}</span>`;
        }
    }

    function resetCodeValidation() {
        codeInput.classList.remove('is-valid', 'is-invalid');
        codeDisplay.classList.remove('text-success', 'text-danger');
        codeDisplay.innerHTML = currentCode;
    }
});
// Update the code display initialization
codeDisplay.textContent = currentCode;
codeDisplay.style.cursor = "pointer";
codeDisplay.title = "Click to copy";

// Add click-to-copy functionality
codeDisplay.addEventListener("click", function() {
    navigator.clipboard.writeText(currentCode);
    const originalText = this.textContent;
    this.textContent = "Copied!";
    setTimeout(() => this.textContent = originalText, 2000);
});

// Update password toggle
togglePassword.addEventListener("click", function() {
    const icon = this.querySelector("i");
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    icon.classList.toggle("bi-eye-slash");
    icon.classList.toggle("bi-eye");
});