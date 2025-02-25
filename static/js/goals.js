function showGoalForm() {
    const modal = document.getElementById('goal-modal');
    modal.style.display = 'flex';
}

function hideGoalForm() {
    const modal = document.getElementById('goal-modal');
    modal.style.display = 'none';
}

function showUpdateGoalForm(goalName) {
    const modal = document.getElementById('update-goal-modal');
    document.getElementById('update-goal-name').value = goalName;
    modal.style.display = 'flex';
}

function hideUpdateGoalForm() {
    const modal = document.getElementById('update-goal-modal');
    modal.style.display = 'none';
}

async function deleteGoal(goalName) {
    if (!confirm('Are you sure you want to delete this goal?')) {
        return;
    }

    try {
        const response = await fetch('/api/goals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'delete',
                name: goalName
            })
        });

        if (response.ok) {
            window.location.reload();
        } else {
            alert('Failed to delete goal. Please try again.');
        }
    } catch (error) {
        console.error('Error deleting goal:', error);
        alert('Failed to delete goal. Please try again.');
    }
}

document.getElementById('goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const goalData = {
        action: 'add',
        name: document.getElementById('goal-name').value,
        target: parseFloat(document.getElementById('goal-target').value),
        current: parseFloat(document.getElementById('goal-current').value),
        deadline: document.getElementById('goal-deadline').value
    };

    try {
        const response = await fetch('/api/goals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(goalData)
        });

        if (response.ok) {
            hideGoalForm();
            window.location.reload();
        } else {
            alert('Failed to add goal. Please try again.');
        }
    } catch (error) {
        console.error('Error adding goal:', error);
        alert('Failed to add goal. Please try again.');
    }
});

document.getElementById('update-goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const goalData = {
        action: 'update',
        name: document.getElementById('update-goal-name').value,
        current: parseFloat(document.getElementById('update-goal-current').value)
    };

    try {
        const response = await fetch('/api/goals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(goalData)
        });

        if (response.ok) {
            hideUpdateGoalForm();
            window.location.reload();
        } else {
            alert('Failed to update goal progress. Please try again.');
        }
    } catch (error) {
        console.error('Error updating goal progress:', error);
        alert('Failed to update goal progress. Please try again.');
    }
});

// Close modals when clicking outside
window.onclick = (event) => {
    const goalModal = document.getElementById('goal-modal');
    const updateModal = document.getElementById('update-goal-modal');
    
    if (event.target === goalModal) {
        hideGoalForm();
    }
    if (event.target === updateModal) {
        hideUpdateGoalForm();
    }
};
