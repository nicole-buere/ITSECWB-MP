const mongoose = require('mongoose'); // Assuming you're using Mongoose
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: String,
    email: { type: String, required: true, unique: true },
    username: String,
    password: String, // Store securely hashed passwords (use a strong hashing algorithm like bcrypt)
    role: { type: String, enum: ['student', 'admin'], default: 'student'}, // Limit role options to prevent invalid data
    description: String,
    profilePicture: String,
    reservations: [ // Corrected: Add comma after closing curly brace
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reservation' // Capitalize 'Reservation' for consistency (assuming a separate schema)
      }
    ]
  });

  const user = mongoose.model('users', userSchema);

  module.exports = user; // Export the model for use in other files
  
   