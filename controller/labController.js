const { supabase } = require('../model/database');
const userController = require('./userController');


exports.reserveASeat = async (req, res) => {
    try {
        const { seatNumber, date, start_time, end_time } = req.body;
        const labName = req.params.labId;
        const username = req.session.username;

        // Find the lab document by its name
        const { data: lab, error: labError } = await supabase
            .from('labs')
            .select('*')
            .eq('name', labName)
            .single();

        if (labError || !lab) {
            return res.status(404).json({ message: "Lab not found", labName });
        }

        // Check if the seat is available for reservation
        const { data: overlappingReservations, error: checkError } = await supabase
            .from('reservation')
            .select('*')
            .eq('lab_id', labName)
            .eq('seatNumber', seatNumber)
            .eq('date', date)
            .or(`start_time.lte.${start_time},end_time.gte.${start_time},start_time.lte.${end_time},end_time.gte.${end_time}`);

        if (checkError) {
            console.error("Error checking overlapping reservations:", checkError);
            return res.status(500).json({ message: "Error checking seat availability" });
        }

        if (overlappingReservations && overlappingReservations.length > 0) {
            return res.status(409).json({ message: "Seat is already reserved for the specified time slot" });
        }

        // Create a new reservation
        const newReservation = {
            date,
            start_time,
            end_time,
            lab_id: labName,
            reserved_by: username,
            seatNumber: parseInt(seatNumber)
        };

        // Insert the reservation
        const { error: insertError } = await supabase
            .from('reservation')
            .insert([newReservation]);

        if (insertError) {
            console.error("Error inserting reservation:", insertError);
            return res.status(500).json({ message: "Error creating reservation" });
        }

        return res.status(201).json({ message: "Reservation successful" });
    } catch (e) {
        console.error("Error occurred while reserving seat:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.adminReserve = async (req, res) => {
    try {
        const { seatNumber, date, start_time, end_time, username } = req.body;
        const labName = req.params.labId;

        console.log(req.body)

        // Find the lab document by its name
        const { data: lab, error: labError } = await supabase
            .from('labs')
            .select('*')
            .eq('name', labName)
            .single();

        if (labError || !lab) {
            return res.status(404).json({ message: "Lab not found", labName });
        }

        // Check if the seat is available for reservation
        const { data: overlappingReservations, error: checkError } = await supabase
            .from('reservation')
            .select('*')
            .eq('lab_id', labName)
            .eq('seatNumber', seatNumber)
            .eq('date', date)
            .or(`start_time.lte.${start_time},end_time.gte.${start_time},start_time.lte.${end_time},end_time.gte.${end_time}`);

        if (checkError) {
            console.error("Error checking overlapping reservations:", checkError);
            return res.status(500).json({ message: "Error checking seat availability" });
        }

        if (overlappingReservations && overlappingReservations.length > 0) {
            return res.status(409).json({ message: "Seat is already reserved for the specified time slot" });
        }

        // Create a new reservation
        const newReservation = {
            date,
            start_time,
            end_time,
            lab_id: labName,
            reserved_by: req.body.user_name,
            seatNumber: parseInt(seatNumber)
        };

        // Insert the reservation
        const { error: insertError } = await supabase
            .from('reservation')
            .insert([newReservation]);

        if (insertError) {
            console.error("Error inserting reservation:", insertError);
            return res.status(500).json({ message: "Error creating reservation" });
        }

        return res.status(201).json({ message: "Reservation successful" });
    } catch (e) {
        console.error("Error occurred while reserving seat:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};


// Define the route for deleting reservations
exports.deleteReservation = async (req, res) => {
    try {
        // Extract parameters from the request body
        const { lab_id, seatNumber, date, start_time, end_time, username } = req.body;

        console.log("Request Body:", req.body.reserved_by);

        // Query to find and delete the reservation
        const query = {
            date: date,
            start_time: start_time,
            end_time: end_time,
            lab_id: lab_id,
            reserved_by: req.body.reserved_by,
            seatNumber: parseInt(seatNumber)
        }

        console.log("Query:", query);

        // Delete the reservation from the database
        const { error: deleteError } = await supabase
            .from('reservation')
            .delete()
            .match(query);

        if (deleteError) {
            console.error("Error deleting reservation:", deleteError);
            return res.status(500).json({ message: "Error deleting reservation" });
        }

        console.log("Reservation deleted successfully");

        return res.status(200).json({ message: "Reservation deleted successfully" });
    } catch (error) {
        console.error("Error occurred while deleting reservation:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};



// Helper function to retrieve 
const retrieveReservation = async (labId, seatNumber, date, startTime, endTime, reservedBy, db) => {
    try {
        console.log("Retrieving reservation...");
        const reservationCollection = db.collection('reservation');

        // Construct the query based on the provided parameters
        const query = {
            "lab_id": labId,
            "seatNumber": seatNumber,
            "date": date,
            "start_time": startTime,
            "end_time": endTime,
            "reserved_by": reservedBy
        };

        console.log("Query:", query);

        // Execute the query to find the reservation
        const reservation = await reservationCollection.findOne(query);
        console.log("Retrieved reservation:", reservation);
        return reservation;
    } catch (error) {
        console.error('Error occurred while retrieving reservation:', error);
        throw error;
    }
};


function formatTime(hour) {
    // Ensure the hour is within the range of 0 to 23
    hour = Math.max(0, Math.min(23, hour));

    // Convert the hour to a string and pad with leading zero if necessary
    const hourStr = hour < 10 ? '0' + hour : String(hour);

    // Return the formatted time string
    return hourStr + ':00';
}



exports.updateReservationProfile = async (req, res) => {
    try {
        console.log("Update reservation profile request received...");

        // Extract data from the request body
        let { newDate, newStart, newEndTime, labId, seatNumber, date, start_time, end_time, reserved_by } = req.body;
        console.log("New Date:", newDate);
        console.log("New Start Time:", newStart);
        console.log("New End Time:", newEndTime);
        console.log("Lab ID:", labId);
        console.log("Seat Number:", seatNumber);
        console.log("Date:", date);
        console.log("Start Time:", start_time);
        console.log("End Time:", end_time);
        console.log("Reserved By:", reserved_by);


        

        // Construct the query based on the provided parameters
        const reservationQuery = {
            "lab_id": labId,
            "seatNumber": parseInt(seatNumber),
            "date": date,
            "start_time": start_time,
            "end_time": end_time,
            "reserved_by": reserved_by
        };

        console.log("Query:", reservationQuery);

        // Update the reservation with the new date and time
        const { error: updateError } = await supabase
            .from('reservation')
            .update({
                date: newDate,
                start_time: newStart,
                end_time: newEndTime
            })
            .match(reservationQuery);

        if (updateError) {
            console.error("Error updating reservation:", updateError);
            return res.status(500).json({ message: 'Error updating reservation' });
        }


        // Send a response indicating success
        res.status(200).json({ message: 'Reservation updated successfully' });
    } catch (error) {
        console.error('Error occurred while updating reservation:', error);
        res.status(500).json({ message: 'An error occurred while updating reservation. Please try again later.' });
    }
};

exports.deleteAllReservationsBasedOnUser = async (req, res) => {
    try {
        // Get the username from the session
        const username = req.session.username;

        // Delete all reservations associated with the session username
        const { error: deleteError } = await supabase
            .from('reservation')
            .delete()
            .eq('reserved_by', username);

        if (deleteError) {
            console.error("Error deleting reservations:", deleteError);
            return res.status(500).json({ message: 'Error deleting reservations' });
        }

        // Respond with success message
        return res.status(200).json({ message: 'All reservations deleted successfully' });
    } catch (error) {
        console.error('Error occurred while deleting reservations:', error);
        // Respond with an error message
        return res.status(500).json({ message: 'Internal server error' });
    }
};


exports.deleteReservationFromLab = async (req, res) => {
    try {
        const { lab_name, seatNumber, date, start_time, end_time, username } = req.body;

        console.log("Request Body:", req.body);

        // Delete the reservation directly from the reservation table
        const { error: deleteError } = await supabase
            .from('reservation')
            .delete()
            .match({
                lab_id: lab_name,
                seatNumber: parseInt(seatNumber),
                date: date,
                start_time: start_time,
                end_time: end_time,
                reserved_by: username
            });

        if (deleteError) {
            console.error("Error deleting reservation:", deleteError);
            return res.status(500).json({ message: "Error deleting reservation" });
        }

        console.log("Reservation deleted successfully");

        return res.status(200).json({ message: "Reservation deleted successfully" });
    } catch (e) {
        console.error("Error occurred while deleting reservation:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
}

