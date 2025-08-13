const express = require('express');
const router = express.Router();
const userController = require('../controller/userController'); // folder is "controller"
const checkRole = require('../middleware/checkRole');          // file is "checkRole.js"

// Public
router.post('/login', userController.loginUser);
router.post('/register', userController.registerUser);

// Authenticated (any logged-in user)
router.get('/profile', checkRole(), userController.getUser);
router.get('/edittprofile', checkRole(), userController.getUser);
router.get('/reserve', checkRole(), userController.getUser);
router.get('/viewprofile', checkRole(), userController.getUser);
router.post('/editDescription', checkRole(), userController.editDescription);
router.post('/editPFP', checkRole(), userController.editPFP);
router.delete('/delete', checkRole(), userController.deleteUser);
router.post('/logout', userController.logoutUser);
router.get('/logout', userController.logoutUser);

// Password change (reuse prevention + 24h minimum age)
router.post('/change-password', checkRole(), userController.changePassword);

module.exports = router;
