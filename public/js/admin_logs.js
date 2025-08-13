document.addEventListener('DOMContentLoaded', () => {
    const logViewer = document.getElementById('logViewer');
    const applyBtn = document.getElementById('applyFilters');
    const filterType = document.getElementById('filterType');
    const filterDate = document.getElementById('filterDate');
    const filterUser = document.getElementById('filterUser');

    // Store original logs for filtering
    const originalLogs = logViewer.textContent.split('\n');

    applyBtn.addEventListener('click', () => {
        let filtered = originalLogs;

        // Filter by type
        if (filterType.value) {
            filtered = filtered.filter(line => line.includes(filterType.value));
        }

        // Filter by date
        if (filterDate.value) {
            filtered = filtered.filter(line => line.startsWith(`[${filterDate.value}`));
        }

        // Filter by user
        if (filterUser.value) {
            filtered = filtered.filter(line => line.includes(`User: ${filterUser.value}`));
        }

        logViewer.textContent = filtered.join('\n');
    });
});