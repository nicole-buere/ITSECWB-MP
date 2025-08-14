// Admin Dashboard JavaScript

// View Users function
async function viewUsers() {
    const usersSection = document.getElementById('users-section');
    const logsSection = document.getElementById('logs-section');
    
    // Hide logs section and show users section
    logsSection.classList.add('hidden');
    usersSection.classList.remove('hidden');
    
    try {
        const response = await fetch('/admin/users');
        if (response.ok) {
            const users = await response.json();
            displayUsers(users);
        } else {
            console.error('Failed to fetch users');
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

// Display users in the table
function displayUsers(users) {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name || 'N/A'}</td>
            <td>${user.username || 'N/A'}</td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.role || 'N/A'}</td>
            <td>${user.description || 'N/A'}</td>
            <td>${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
        `;
        tbody.appendChild(row);
    });
}

// View Logs function
async function viewLogs() {
    const usersSection = document.getElementById('users-section');
    const logsSection = document.getElementById('logs-section');
    
    // Hide users section and show logs section
    usersSection.classList.add('hidden');
    logsSection.classList.remove('hidden');
    
    try {
        const response = await fetch('/admin/logs/validation');
        if (response.ok) {
            const logs = await response.json();
            displayLogs(logs);
        } else {
            console.error('Failed to fetch logs');
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
}

// Display logs in the table
function displayLogs(logs) {
    const tbody = document.getElementById('logs-tbody');
    tbody.innerHTML = '';
    
    logs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</td>
            <td>Validation Failure</td>
            <td>${log.error_message || 'N/A'}</td>
        `;
        tbody.appendChild(row);
    });
}
