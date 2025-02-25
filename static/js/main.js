// Update income
document.getElementById('income-input').addEventListener('change', async (e) => {
    const newIncome = parseFloat(e.target.value);
    if (isNaN(newIncome) || newIncome < 0) {
        alert('Please enter a valid income amount');
        return;
    }

    try {
        const response = await fetch('/api/update-income', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ income: newIncome })
        });

        if (response.ok) {
            window.location.reload();
        } else {
            alert('Failed to update income. Please try again.');
        }
    } catch (error) {
        console.error('Error updating income:', error);
        alert('Failed to update income. Please try again.');
    }
});

// Modal functions
function showExpenseForm() {
    const modal = document.getElementById('expense-modal');
    modal.style.display = 'flex';
    // Set default date to today
    document.getElementById('expense-date').valueAsDate = new Date();
}

function hideExpenseForm() {
    const modal = document.getElementById('expense-modal');
    modal.style.display = 'none';
}

// Handle expense form submission
document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const expenseData = {
        date: document.getElementById('expense-date').value,
        category: document.getElementById('expense-category').value,
        amount: parseFloat(document.getElementById('expense-amount').value),
        description: document.getElementById('expense-description').value
    };

    try {
        const response = await fetch('/add-expense', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(expenseData)
        });

        if (response.ok) {
            hideExpenseForm();
            window.location.reload();
        } else {
            alert('Failed to add expense. Please try again.');
        }
    } catch (error) {
        console.error('Error adding expense:', error);
        alert('Failed to add expense. Please try again.');
    }
});

// Data export function
async function exportData() {
    try {
        const response = await fetch('/api/export-data');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fintrack_data_${new Date().toISOString().slice(0,7)}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Failed to export data. Please try again.');
    }
}

// Utility functions for formatting
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatPercentage(value) {
    return `${value.toFixed(1)}%`;
}

// Create pie chart
function createExpensesChart(data) {
    const trace = {
        values: Object.values(data),
        labels: Object.keys(data),
        type: 'pie',
        marker: {
            colors: ['#2E7D32', '#1976D2', '#FFC107', '#43A047', '#263238', '#757575']
        }
    };

    const layout = {
        height: 400,
        margin: { t: 0, b: 0, l: 0, r: 0 }
    };

    Plotly.newPlot('expenses-chart', [trace], layout);
}

// Create transactions table
function createTransactionsTable(transactions) {
    const tableDiv = document.getElementById('transactions-table');
    if (transactions.length === 0) {
        tableDiv.innerHTML = '<p>No recent transactions</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'transactions-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Description</th>
        </tr>
    `;

    const tbody = document.createElement('tbody');
    tbody.innerHTML = transactions.map(tx => `
        <tr>
            <td>${new Date(tx.date).toLocaleDateString()}</td>
            <td>${tx.category}</td>
            <td>${formatCurrency(tx.amount)}</td>
            <td>${tx.description}</td>
        </tr>
    `).join('');

    table.appendChild(thead);
    table.appendChild(tbody);
    tableDiv.innerHTML = '';
    tableDiv.appendChild(table);
}

// Load initial data
async function loadDashboardData() {
    try {
        const response = await fetch('/api/expenses');
        const data = await response.json();

        if (Object.keys(data.by_category).length > 0) {
            createExpensesChart(data.by_category);
        }

        createTransactionsTable(data.recent);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', loadDashboardData);

// Close modal when clicking outside
window.onclick = (event) => {
    const modal = document.getElementById('expense-modal');
    if (event.target === modal) {
        hideExpenseForm();
    }
};
