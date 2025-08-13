const express = require('express');
const router = express.Router();
const labController = require('../controller/labController');
const session = require('express-session');
const checkRole = require('../middleware/checkRole');

// Define the route with the labName parameter (A, B, C)
router.post('/reserve/:labName', checkRole(['student', 'admin']), labController.reserveASeat);
router.post('/check-availability/:labName', checkRole(['student', 'admin']), labController.checkSeatAvailability);
router.delete('/delete', checkRole(['student', 'admin']), labController.deleteReservation);
router.delete('/deleteUserRes', checkRole(['student', 'admin']), labController.deleteAllReservationsBasedOnUser);
router.delete('/deleteFromLab', checkRole(['student', 'admin']), labController.deleteReservationFromLab);
router.put('/updateProfile', checkRole(['student', 'admin']), labController.updateReservationProfile);
router.post('/adminreserve/:labName', checkRole(['admin']), labController.adminReserve);

module.exports = router;