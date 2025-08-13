// routes/userRoutes.js
const express = require('express');
const router = express.Router();

const userController = require('../controller/userController');   // path must be correct
const checkRole = require('../middleware/checkRole');             // file must be "checkRole.js"

// --- TEMP DEBUG to pinpoint what's undefined ---
console.log('userController keys:', Object.keys(userController || {}));
console.log('typeof changePassword:', typeof userController.changePassword);
console.log('typeof checkRole:', typeof checkRole);

// Public
router.post('/login', userController.loginUser);
router.post('/register', userController.registerUser);

// Authenticated
router.get('/profile',       checkRole(), userController.getUser);
router.get('/edittprofile',  checkRole(), userController.getUser);
router.get('/reserve',       checkRole(), userController.getUser);
router.get('/viewprofile',   checkRole(), userController.getUser);
router.post('/editDescription', checkRole(), userController.editDescription);
router.post('/editPFP',         checkRole(), userController.editPFP);
router.delete('/delete',        checkRole(), userController.deleteUser);

// Logout (don’t gate while testing)
router.post('/logout', userController.logoutUser);
router.get('/logout',  userController.logoutUser);

// Password change
router.post('/change-password', checkRole(), userController.changePassword);

module.exports = router;
