function showBudgetForm() {
    const modal = document.getElementById('budget-modal');
    modal.style.display = 'flex';
}

function hideBudgetForm() {
    const modal = document.getElementById('budget-modal');
    modal.style.display = 'none';
}

document.getElementById('budget-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const budgetData = {
        category: document.getElementById('budget-category').value,
        amount: parseFloat(document.getElementById('budget-amount').value)
    };

    try {
        const response = await fetch('/api/budget', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(budgetData)
        });

        if (response.ok) {
            hideBudgetForm();
            window.location.reload();
        } else {
            alert('Failed to update budget. Please try again.');
        }
    } catch (error) {
        console.error('Error updating budget:', error);
        alert('Failed to update budget. Please try again.');
    }
});

// Close modal when clicking outside
window.onclick = (event) => {
    const modal = document.getElementById('budget-modal');
    if (event.target === modal) {
        hideBudgetForm();
    }
};
