const express = require('express');
const router = express.Router();
const reservationController = require('../controller/reservationController');
const session = require('express-session');
const checkRole = require('../middleware/checkRole');

router.post('/createReservation', checkRole(['student', 'admin']), reservationController.createReservation);
router.get('/retrievePost', checkRole(['student', 'admin']), reservationController.getReservation);
router.get('/allReservations', checkRole(['student', 'admin']), reservationController.getAllReservations);
router.get('/profile', checkRole(['student', 'admin']), reservationController.getUserReservations);
router.get('/reserve', checkRole(['student', 'admin']), reservationController.getUserReservations);
router.get('/viewprofile', checkRole(['student', 'admin']), reservationController.getUserReservations);
router.put('/update', checkRole(['admin']), reservationController.updateReservation);

// router.post('profile-edit', userController.editProfile);
module.exports = router;