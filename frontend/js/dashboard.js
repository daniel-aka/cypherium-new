// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadDashboardData();
    
    // Setup event listeners for quick action buttons
    setupQuickActions();
});

async function loadDashboardData() {
    try {
        // Load user data
        const user = await api.auth.getCurrentUser();
        if (user) {
            document.getElementById('userName').textContent = user.fullName;
        }

        // Load investments
        const investments = await api.investments.getInvestments();
        updateInvestmentsTable(investments);

        // Load transactions
        const transactions = await api.investments.getTransactions();
        updateTransactionsTable(transactions);

        // Update dashboard stats
        updateDashboardStats(investments, transactions);
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showError('Failed to load dashboard data. Please try again later.');
    }
}

function updateInvestmentsTable(investments) {
    const tbody = document.getElementById('investmentsTable');
    tbody.innerHTML = '';

    investments.forEach(investment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${investment.name}</td>
            <td>$${investment.amount.toFixed(2)}</td>
            <td>${new Date(investment.startDate).toLocaleDateString()}</td>
            <td><span class="badge bg-${getStatusColor(investment.status)}">${investment.status}</span></td>
            <td>$${investment.returns.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateTransactionsTable(transactions) {
    const tbody = document.getElementById('transactionsTable');
    tbody.innerHTML = '';

    transactions.slice(0, 5).forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(transaction.date).toLocaleDateString()}</td>
            <td>${transaction.type}</td>
            <td>$${transaction.amount.toFixed(2)}</td>
            <td><span class="badge bg-${getStatusColor(transaction.status)}">${transaction.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function updateDashboardStats(investments, transactions) {
    // Calculate total balance
    const totalBalance = transactions.reduce((sum, t) => {
        return sum + (t.type === 'deposit' ? t.amount : -t.amount);
    }, 0);

    // Calculate active investments
    const activeInvestments = investments.filter(i => i.status === 'active').length;

    // Calculate total returns
    const totalReturns = investments.reduce((sum, i) => sum + i.returns, 0);

    // Update the UI
    document.getElementById('totalBalance').textContent = totalBalance.toFixed(2);
    document.getElementById('activeInvestments').textContent = activeInvestments;
    document.getElementById('totalReturns').textContent = totalReturns.toFixed(2);
}

function setupQuickActions() {
    // Deposit button
    document.getElementById('depositBtn').addEventListener('click', () => {
        const amount = prompt('Enter deposit amount:');
        if (amount && !isNaN(amount)) {
            api.investments.deposit(parseFloat(amount))
                .then(() => {
                    loadDashboardData();
                    showSuccess('Deposit successful!');
                })
                .catch(error => showError(error.message));
        }
    });

    // Withdraw button
    document.getElementById('withdrawBtn').addEventListener('click', () => {
        const amount = prompt('Enter withdrawal amount:');
        if (amount && !isNaN(amount)) {
            api.investments.withdraw(parseFloat(amount))
                .then(() => {
                    loadDashboardData();
                    showSuccess('Withdrawal successful!');
                })
                .catch(error => showError(error.message));
        }
    });

    // New Investment button
    document.getElementById('investBtn').addEventListener('click', () => {
        const amount = prompt('Enter investment amount:');
        if (amount && !isNaN(amount)) {
            const investmentData = {
                name: 'New Investment',
                amount: parseFloat(amount),
                type: 'standard'
            };
            api.investments.createInvestment(investmentData)
                .then(() => {
                    loadDashboardData();
                    showSuccess('Investment created successfully!');
                })
                .catch(error => showError(error.message));
        }
    });
}

function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'active':
            return 'success';
        case 'pending':
            return 'warning';
        case 'completed':
            return 'info';
        case 'failed':
            return 'danger';
        default:
            return 'secondary';
    }
}

function showSuccess(message) {
    // You can implement a toast notification here
    alert(message);
}

function showError(message) {
    // You can implement a toast notification here
    alert('Error: ' + message);
}