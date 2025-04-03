// DOM Elements
let currentUser = null;
let investmentPlans = [
    {
        id: 'bronze',
        name: 'Bronze Plan',
        minAmount: 200,
        maxAmount: 12500,
        duration: 30,
        dailyReturn: 0.0167,
        totalReturn: 0.5,
        description: 'Perfect for beginners. Low risk, stable returns.'
    },
    {
        id: 'silver',
        name: 'Silver Plan',
        minAmount: 500,
        maxAmount: 24000,
        duration: 30,
        dailyReturn: 0.0267,
        totalReturn: 0.8,
        description: 'Balanced risk and reward. Ideal for moderate investors.'
    },
    {
        id: 'gold',
        name: 'Gold Plan',
        minAmount: 25000,
        maxAmount: 500000,
        duration: 30,
        dailyReturn: 0.04,
        totalReturn: 1.2,
        description: 'Higher returns for experienced investors.'
    }
];

// Initialize modals
const liveChatModal = new bootstrap.Modal(document.getElementById('liveChatModal'));
const investmentInstructionsModal = new bootstrap.Modal(document.getElementById('investmentInstructionsModal'));
const withdrawModal = new bootstrap.Modal(document.getElementById('withdrawalModal'));
const withdrawalInstructionsModal = new bootstrap.Modal(document.getElementById('withdrawalInstructionsModal'));
const balanceModal = new bootstrap.Modal(document.getElementById('balanceModal'));

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Add click handlers to action cards
    document.querySelector('.action-card:nth-child(1)').addEventListener('click', () => {
        openLiveChat('investment');
    });

    document.querySelector('.action-card:nth-child(2)').addEventListener('click', () => {
        openBalanceModal();
    });

    document.querySelector('.action-card:nth-child(3)').addEventListener('click', () => {
        openWithdrawalModal();
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
                document.getElementById('dailyReturn').textContent = `${(plan.dailyReturn * 100).toFixed(2)}%`;
                document.getElementById('totalReturn').textContent = `${(plan.totalReturn * 100).toFixed(2)}%`;
            }
        });
    });

    // Add event listener for investment amount input
    document.getElementById('investmentAmount').addEventListener('input', validateAmount);

    // Add event listener for withdrawal amount input
    document.getElementById('withdrawalAmount').addEventListener('input', validateWithdrawalAmount);

    // Add event listener for payment method selection
    document.getElementById('paymentMethod').addEventListener('change', updatePaymentDetails);

    // Add logout button event listener
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
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
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
            }
            throw new Error('Failed to fetch user data');
        }
        return response.json();
    })
    .then(data => {
        currentUser = data;
        updateUserInfo();
        loadInvestmentHistory();
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Failed to load user data', 'danger');
    });
}

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.username || 'User';
        document.getElementById('walletBalance').textContent = `$${currentUser.balance.toFixed(2)}`;
        document.getElementById('totalInvestments').textContent = `$${currentUser.totalInvested.toFixed(2)}`;
        document.getElementById('totalEarnings').textContent = `$${currentUser.totalEarnings.toFixed(2)}`;
    }
}

function loadInvestmentHistory() {
    const token = localStorage.getItem('token');
    fetch('/api/investments/history', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to load investment history');
        return response.json();
    })
    .then(investments => {
        updateInvestmentHistory(investments);
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Failed to load investment history', 'danger');
    });
}

function updateInvestmentHistory(investments) {
    const tbody = document.getElementById('investmentHistory');
    if (!investments || investments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No investments yet</td></tr>';
        return;
    }

    tbody.innerHTML = investments.map(inv => `
        <tr>
            <td>${new Date(inv.createdAt).toLocaleDateString()}</td>
            <td>${inv.planType}</td>
            <td>$${inv.amount.toFixed(2)}</td>
            <td>$${inv.dailyReturn.toFixed(2)}</td>
            <td>$${inv.totalReturn.toFixed(2)}</td>
            <td><span class="status-badge bg-${getStatusColor(inv.status)}">${inv.status}</span></td>
        </tr>
    `).join('');
}

function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'active': return 'success';
        case 'pending': return 'warning';
        case 'completed': return 'info';
        case 'cancelled': return 'danger';
        default: return 'secondary';
    }
}

// Modal functions
function openLiveChat(action) {
    document.getElementById('investmentPlansSection').style.display = 'block';
    document.getElementById('chatSection').style.display = 'none';
    document.getElementById('liveChatModalLabel').textContent = 'Investment Plans';
    liveChatModal.show();
}

function openWithdrawalModal() {
    const availableBalance = document.getElementById('walletBalance').textContent.replace('$', '');
    document.getElementById('availableBalance').value = availableBalance;
    
    document.getElementById('withdrawalAmount').value = '';
    document.getElementById('paymentMethod').value = '';
    document.getElementById('paymentDetails').value = '';
    document.getElementById('withdrawalHelp').textContent = '';
    document.getElementById('paymentHelp').textContent = '';
    document.getElementById('withdrawButton').disabled = true;
    
    withdrawModal.show();
}

function openBalanceModal() {
    const currentBalance = document.getElementById('walletBalance').textContent.replace('$', '');
    document.getElementById('currentBalance').value = currentBalance;
    document.getElementById('balanceAmount').value = '';
    document.getElementById('balanceHelp').textContent = '';
    document.getElementById('updateBalanceButton').disabled = true;
    balanceModal.show();
}

// Investment functions
function validateAmount() {
    const planSelect = document.getElementById('planSelect');
    const amountInput = document.getElementById('investmentAmount');
    const amountHelp = document.getElementById('amountHelp');
    const investButton = document.getElementById('investButton');

    if (!planSelect.value) {
        amountHelp.textContent = 'Please select a plan first';
        investButton.disabled = true;
        return;
    }

    const plan = investmentPlans.find(p => p.name === planSelect.value);
    if (!plan) {
        amountHelp.textContent = 'Please select a valid plan';
        investButton.disabled = true;
        return;
    }

    const amount = parseFloat(amountInput.value) || 0;

    if (amount < plan.minAmount) {
        amountHelp.textContent = `Minimum amount is $${plan.minAmount}`;
        investButton.disabled = true;
    } else if (amount > plan.maxAmount) {
        amountHelp.textContent = `Maximum amount is $${plan.maxAmount}`;
        investButton.disabled = true;
    } else {
        amountHelp.textContent = '';
        investButton.disabled = false;
    }

    calculateProfits();
}

function calculateProfits() {
    const planSelect = document.getElementById('planSelect');
    const amountInput = document.getElementById('investmentAmount');
    const amount = parseFloat(amountInput.value) || 0;
    
    const plan = investmentPlans.find(p => p.name === planSelect.value);
    if (!plan) return;

    const dailyProfit = amount * plan.dailyReturn;
    const totalProfit = amount * plan.totalReturn;

    document.getElementById('dailyProfit').textContent = `$${dailyProfit.toFixed(2)}`;
    document.getElementById('totalProfit').textContent = `$${totalProfit.toFixed(2)}`;
}

function submitInvestment() {
    const amount = parseFloat(document.getElementById('investmentAmount').value) || 0;
    const planSelect = document.getElementById('planSelect');
    const plan = investmentPlans.find(p => p.name === planSelect.value);

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

    const dailyProfit = amount * plan.dailyReturn;
    const totalProfit = amount * plan.totalReturn;

    const investmentDetails = `I would like to invest $${amount.toFixed(2)} in the ${plan.name}.\n\nInvestment Details:\n- Amount: $${amount.toFixed(2)}\n- Plan: ${plan.name}\n- Daily Return: $${dailyProfit.toFixed(2)}\n- Total Return: $${totalProfit.toFixed(2)}\n- Duration: ${plan.duration} days\n\nPlease process my investment.`;

    document.getElementById('investmentDetails').value = investmentDetails;

    liveChatModal.hide();
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

    const withdrawalDetails = `I would like to withdraw $${amount.toFixed(2)} via ${method}.\n\nWithdrawal Details:\n- Amount: $${amount.toFixed(2)}\n- Method: ${method}\n\nPlease process my withdrawal request.`;

    document.getElementById('withdrawalDetails').value = withdrawalDetails;

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
    currentUser = null;
    window.location.href = '/login.html';
}

// Copy to clipboard functions
function copyToClipboard() {
    const textarea = document.getElementById('investmentDetails');
    textarea.select();
    document.execCommand('copy');
    
    const button = document.querySelector('#investmentInstructionsModal .btn-primary');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="bi bi-check-circle me-2"></i>Copied!';
    setTimeout(() => {
        button.innerHTML = originalText;
    }, 2000);
}

function copyWithdrawalToClipboard() {
    const textarea = document.getElementById('withdrawalDetails');
    textarea.select();
    document.execCommand('copy');
    
    const button = document.querySelector('#withdrawalInstructionsModal .btn-primary');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="bi bi-check-circle me-2"></i>Copied!';
    setTimeout(() => {
        button.innerHTML = originalText;
    }, 2000);
}

// Function to update amount limits based on selected plan
function updateAmountLimits() {
    const planSelect = document.getElementById('planSelect');
    const amountInput = document.getElementById('investmentAmount');
    const amountHelp = document.getElementById('amountHelp');
    const investButton = document.getElementById('investButton');

    if (!planSelect.value) {
        amountInput.disabled = true;
        amountInput.value = '';
        amountHelp.textContent = 'Please select a plan first';
        investButton.disabled = true;
        return;
    }

    amountInput.disabled = false;
    investButton.disabled = false;

    const plan = investmentPlans.find(p => p.name === planSelect.value);
    if (plan) {
        amountInput.min = plan.minAmount;
        amountInput.max = plan.maxAmount;
        amountHelp.textContent = `Enter amount between $${plan.minAmount} and $${plan.maxAmount}`;
    }

    validateAmount();
}