// DOM Elements
let currentUser = null;
let investmentPlans = [
    {
        id: 'bronze',
        name: 'Bronze Plan',
        minAmount: 100,
        maxAmount: 999,
        duration: 7,
        dailyReturn: 0.05,
        totalReturn: 0.35,
        description: 'Perfect for beginners. Low risk, stable returns.'
    },
    {
        id: 'silver',
        name: 'Silver Plan',
        minAmount: 1000,
        maxAmount: 4999,
        duration: 14,
        dailyReturn: 0.08,
        totalReturn: 1.12,
        description: 'Balanced risk and reward. Ideal for moderate investors.'
    },
    {
        id: 'gold',
        name: 'Gold Plan',
        minAmount: 5000,
        maxAmount: 9999,
        duration: 21,
        dailyReturn: 0.12,
        totalReturn: 2.52,
        description: 'Higher returns for experienced investors.'
    },
    {
        id: 'platinum',
        name: 'Platinum Plan',
        minAmount: 10000,
        maxAmount: 50000,
        duration: 30,
        dailyReturn: 0.15,
        totalReturn: 4.5,
        description: 'Maximum returns for serious investors.'
    }
];

// Initialize modals
const liveChatModal = new bootstrap.Modal(document.getElementById('liveChatModal'));
const investmentInstructionsModal = new bootstrap.Modal(document.getElementById('investmentInstructionsModal'));
const withdrawModal = new bootstrap.Modal(document.getElementById('withdrawModal'));
const withdrawalInstructionsModal = new bootstrap.Modal(document.getElementById('withdrawalInstructionsModal'));
const balanceModal = new bootstrap.Modal(document.getElementById('balanceModal'));
const newInvestmentModal = new bootstrap.Modal(document.getElementById('newInvestmentModal'));
const depositModal = new bootstrap.Modal(document.getElementById('depositModal'));

// Initialize tooltips
const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
const tooltips = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
});

// Initialize popovers
const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
const popovers = popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl);
});

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Add click handlers to action cards
    document.querySelector('.action-card[data-bs-toggle="modal"][data-bs-target="#newInvestmentModal"]').addEventListener('click', () => {
        newInvestmentModal.show();
    });

    document.querySelector('.action-card[data-bs-toggle="modal"][data-bs-target="#depositModal"]').addEventListener('click', () => {
        depositModal.show();
    });

    document.querySelector('.action-card[data-bs-toggle="modal"][data-bs-target="#withdrawModal"]').addEventListener('click', () => {
        // Set available balance
        const availableBalance = document.getElementById('walletBalance').textContent;
        document.getElementById('availableBalance').value = availableBalance;
        
        // Reset form
        document.getElementById('withdrawalAmount').value = '';
        document.getElementById('paymentMethod').value = '';
        document.getElementById('paymentDetails').value = '';
        document.getElementById('withdrawalHelp').textContent = '';
        document.getElementById('paymentHelp').textContent = '';
        document.getElementById('withdrawButton').disabled = true;
        
        // Show modal
        withdrawModal.show();
    });

    // Add event listeners for investment plan selection
    document.querySelectorAll('.investment-plan').forEach(plan => {
        plan.addEventListener('click', function() {
            const planId = this.getAttribute('data-plan-id');
            const plan = investmentPlans.find(p => p.id === planId);
            if (plan) {
                document.getElementById('selectedPlan').value = planId;
                document.getElementById('minAmount').textContent = `$${plan.minAmount}`;
                document.getElementById('maxAmount').textContent = `$${plan.maxAmount}`;
                document.getElementById('duration').textContent = `${plan.duration} days`;
                document.getElementById('dailyReturn').textContent = `${plan.dailyReturn * 100}%`;
                document.getElementById('totalReturn').textContent = `${plan.totalReturn * 100}%`;
            }
        });
    });

    // Add event listener for investment amount input
    document.getElementById('investmentAmount').addEventListener('input', validateInvestmentAmount);

    // Add event listener for withdrawal amount input
    document.getElementById('withdrawalAmount').addEventListener('input', validateWithdrawalAmount);

    // Add event listener for payment method selection
    document.getElementById('paymentMethod').addEventListener('change', updatePaymentDetails);
});

// Authentication functions
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Fetch user data
    fetch('/api/user', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Authentication failed');
        }
        return response.json();
    })
    .then(data => {
        currentUser = data;
        updateUserInfo();
    })
    .catch(error => {
        console.error('Error:', error);
        window.location.href = '/login.html';
    });
}

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('walletBalance').textContent = `$${currentUser.balance.toFixed(2)}`;
        document.getElementById('totalInvested').textContent = `$${currentUser.totalInvested.toFixed(2)}`;
        document.getElementById('totalEarnings').textContent = `$${currentUser.totalEarnings.toFixed(2)}`;
    }
}

// Investment functions
function validateInvestmentAmount() {
    const amount = parseFloat(this.value) || 0;
    const planId = document.getElementById('selectedPlan').value;
    const plan = investmentPlans.find(p => p.id === planId);
    
    if (!plan) {
        document.getElementById('investmentHelp').textContent = 'Please select an investment plan first';
        document.getElementById('investButton').disabled = true;
        return;
    }

    if (amount < plan.minAmount) {
        document.getElementById('investmentHelp').textContent = `Minimum investment is $${plan.minAmount}`;
        document.getElementById('investButton').disabled = true;
    } else if (amount > plan.maxAmount) {
        document.getElementById('investmentHelp').textContent = `Maximum investment is $${plan.maxAmount}`;
        document.getElementById('investButton').disabled = true;
    } else {
        document.getElementById('investmentHelp').textContent = '';
        document.getElementById('investButton').disabled = false;
    }
}

function submitInvestment() {
    const amount = parseFloat(document.getElementById('investmentAmount').value) || 0;
    const planId = document.getElementById('selectedPlan').value;
    const plan = investmentPlans.find(p => p.id === planId);

    if (!amount || amount <= 0) {
        showAlert('Please enter a valid amount', 'danger');
        return;
    }

    if (!plan) {
        showAlert('Please select an investment plan', 'danger');
        return;
    }

    if (amount < plan.minAmount || amount > plan.maxAmount) {
        showAlert(`Amount must be between $${plan.minAmount} and $${plan.maxAmount}`, 'danger');
        return;
    }

    // Generate investment details message
    const investmentDetails = `I would like to invest $${amount.toFixed(2)} in the ${plan.name}.\n\nInvestment Details:\n- Amount: $${amount.toFixed(2)}\n- Plan: ${plan.name}\n- Duration: ${plan.duration} days\n- Daily Return: ${plan.dailyReturn * 100}%\n- Total Return: ${plan.totalReturn * 100}%\n\nPlease process my investment.`;

    // Set the investment details in the textarea
    document.getElementById('investmentDetails').value = investmentDetails;

    // Close the investment modal and show the instructions modal
    newInvestmentModal.hide();
    setTimeout(() => {
        investmentInstructionsModal.show();
    }, 300);
}

// Withdrawal functions
function validateWithdrawalAmount() {
    const amount = parseFloat(this.value) || 0;
    const availableBalance = parseFloat(document.getElementById('walletBalance').textContent.replace('$', '')) || 0;
    const minWithdrawal = 100;

    if (amount < minWithdrawal) {
        document.getElementById('withdrawalHelp').textContent = `Minimum withdrawal is $${minWithdrawal}`;
        document.getElementById('withdrawButton').disabled = true;
    } else if (amount > availableBalance) {
        document.getElementById('withdrawalHelp').textContent = 'Insufficient balance';
        document.getElementById('withdrawButton').disabled = true;
    } else {
        document.getElementById('withdrawalHelp').textContent = '';
        document.getElementById('withdrawButton').disabled = false;
    }
}

function updatePaymentDetails() {
    const method = this.value;
    const paymentDetailsInput = document.getElementById('paymentDetails');
    const paymentHelp = document.getElementById('paymentHelp');

    switch (method) {
        case 'Bitcoin':
            paymentDetailsInput.placeholder = 'Enter your Bitcoin wallet address';
            paymentHelp.textContent = 'Please enter a valid Bitcoin wallet address';
            break;
        case 'Ethereum':
            paymentDetailsInput.placeholder = 'Enter your Ethereum wallet address';
            paymentHelp.textContent = 'Please enter a valid Ethereum wallet address';
            break;
        case 'PayPal':
            paymentDetailsInput.placeholder = 'Enter your PayPal email';
            paymentHelp.textContent = 'Please enter your PayPal email address';
            break;
        case 'CashApp':
            paymentDetailsInput.placeholder = 'Enter your Cash App $tag';
            paymentHelp.textContent = 'Please enter your Cash App $tag';
            break;
        case 'Venmo':
            paymentDetailsInput.placeholder = 'Enter your Venmo username';
            paymentHelp.textContent = 'Please enter your Venmo username';
            break;
        default:
            paymentDetailsInput.placeholder = 'Enter your payment details';
            paymentHelp.textContent = '';
    }
}

function submitWithdrawal() {
    const amount = parseFloat(document.getElementById('withdrawalAmount').value) || 0;
    const method = document.getElementById('paymentMethod').value;
    const availableBalance = parseFloat(document.getElementById('walletBalance').textContent.replace('$', '')) || 0;

    if (!amount || amount <= 0) {
        showAlert('Please enter a valid amount', 'danger');
        return;
    }

    if (amount > availableBalance) {
        showAlert('Insufficient balance', 'danger');
        return;
    }

    if (!method) {
        showAlert('Please select a withdrawal method', 'danger');
        return;
    }

    // Generate withdrawal details message
    const withdrawalDetails = `I would like to withdraw $${amount.toFixed(2)} via ${method}.\n\nWithdrawal Details:\n- Amount: $${amount.toFixed(2)}\n- Method: ${method}\n\nPlease process my withdrawal request.`;

    // Set the withdrawal details in the textarea
    document.getElementById('withdrawalDetails').value = withdrawalDetails;

    // Close the withdrawal modal and show the instructions modal
    withdrawModal.hide();
    setTimeout(() => {
        withdrawalInstructionsModal.show();
    }, 300);
}

// Utility functions
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}