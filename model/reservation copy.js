const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reservationSchema = new Schema({
    date: String,
    start_time: String,
    end_time: String,
    lab_id: String,
    anonymous: String,
    reserved_by: { type: Schema.Types.ObjectId, ref: 'User' }, // Reference to User model
    seatNumber: Number 
});
  
const Reservation = mongoose.model('Reservation', reservationSchema);

module.exports = Reservation;
  