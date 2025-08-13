const express = require('express');
const router = express.Router();
const labController = require('../controller/labController');
const session = require('express-session');
const checkRole = require('../middleware/checkRole');

// Define the route with the labId parameter
router.post('/reserve/:labId', checkRole(['student', 'admin']), labController.reserveASeat);
router.delete('/delete', checkRole(['student', 'admin']), labController.deleteReservation);
router.delete('/deleteUserRes', checkRole(['student', 'admin']), labController.deleteAllReservationsBasedOnUser);
router.delete('/deleteFromLab', checkRole(['student', 'admin']), labController.deleteReservationFromLab);
router.put('/updateProfile', checkRole(['student', 'admin']), labController.updateReservationProfile);
router.post('/adminreserve/:labId', checkRole(['admin']), labController.adminReserve);

module.exports = router;