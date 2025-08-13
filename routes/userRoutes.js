const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const session = require('express-session');
const checkRole = require('../middleware/checkRole');

router.post('/login', userController.loginUser);
router.post('/register', userController.registerUser);

router.get('/profile', checkRole(), userController.getUser);
router.get('/edittprofile', checkRole(), userController.getUser);
router.get('/reserve', checkRole(), userController.getUser);
router.get('/viewprofile', checkRole(), userController.getUser);
router.post('/editDescription', checkRole(), userController.editDescription);
router.post('/editPFP', checkRole(), userController.editPFP);
router.delete('/delete', checkRole(), userController.deleteUser);
router.post('/logout', checkRole(), userController.logoutUser);

module.exports = router;
