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


module.exports = router;
