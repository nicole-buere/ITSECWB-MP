// routes/userRoutes.js
const express = require('express');
const router = express.Router();

const userController = require('../controller/userController');
const checkRole = require('../middleware/checkRole');

// Debug (optional)
console.log('userController keys:', Object.keys(userController || {}));
console.log('typeof changePassword:', typeof userController.changePassword);
console.log('typeof checkRole:', typeof checkRole);

// Public
router.post('/login', userController.loginUser);
router.post('/register', userController.registerUser);

// Forgot / Reset (public but “behind” checkRole with allowAnonymous)
router.post('/forgot-password', checkRole([], { allowAnonymous: true }), userController.requestPasswordReset);
router.post('/reset-password',  checkRole([], { allowAnonymous: true }), userController.resetPassword);

// Authenticated-only
router.get('/profile',         checkRole(), userController.getUser);
router.get('/edittprofile',    checkRole(), userController.getUser);
router.get('/reserve',         checkRole(), userController.getUser);
router.get('/viewprofile',     checkRole(), userController.getUser);
router.post('/editDescription',checkRole(), userController.editDescription);
router.post('/editPFP',        checkRole(), userController.editPFP);
router.delete('/delete',       checkRole(), userController.deleteUser);

// Logout
router.post('/logout', userController.logoutUser);
router.get('/logout',  userController.logoutUser);

router.post('/forgot-password', userController.requestPasswordReset);
router.post('/reset-password',  userController.resetPassword);
router.post('/change-password',  userController.changePassword);

// KBA (security questions)
router.get('/kba/questions', checkRole([], { allowAnonymous: true }), userController.listKbaQuestions);
router.get('/kba/me',        checkRole(), userController.getMyKbaStatus);
router.post('/kba/enroll',   checkRole(), userController.enrollKba);
// Allow anonymous: user is proving possession of the emailed token
router.get('/kba/question-by-token',
  checkRole([], { allowAnonymous: true }),
  userController.getKbaQuestionForToken
);

// Admin routes
router.get('/admin/dashboard', checkRole(['admin']), userController.getAdminDashboard);
router.get('/admin/users', checkRole(['admin']), userController.getAllUsers);
router.get('/admin/logs/validation', checkRole(['admin']), userController.getValidationLogs);
router.get('/admin/logs/login', checkRole(['admin']), userController.getLoginLogs);
router.get('/admin/logs/kba', checkRole(['admin']), userController.getKbaLogs);
router.get('/admin/logs/activity', checkRole(['admin']), userController.getActivityLogs);

// User management routes
router.put('/admin/users/:userId', checkRole(['admin']), userController.updateUser);
router.delete('/admin/users/:userId', checkRole(['admin']), userController.deleteUser);

module.exports = router;
