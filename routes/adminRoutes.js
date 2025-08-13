const express = require('express');
const path = require('path');
const fs = require('fs');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// Admin-only log viewing route
router.get('/logs', checkRole(['admin']), (req, res) => {
    const logPath = path.join(__dirname, '../access.log');
    fs.readFile(logPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).render('error_page', {
                title: 'Internal Server Error',
                errorCode: '500',
                errorTitle: 'Internal Server Error',
                errorMessage: 'Could not read log file.',
                errorDescription: 'There was an error accessing the logs.',
                showLogin: false
            });
        }
        res.render('admin_logs', { title: 'Access Logs', logs: data });
    });
});

module.exports = router;