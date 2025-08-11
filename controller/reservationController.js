const { supabase } = require('../model/database');


exports.getUserReservations = async (req, res) => {
  try {
    // Get all reservations from the reservation table
    const { data: reservationList, error } = await supabase
      .from('reservation')
      .select('*');

    if (error) {
      console.error("Error fetching reservations:", error);
      return res.status(500).json({ message: "Error fetching reservations" });
    }

    res.json(reservationList || []);
  } catch (e) {
    console.error("Error in getUserReservations:", e);
    res.status(500).json({ message: e.message });
  }
};



exports.getReservationByUsername = async (req, res) => {
    try {
      // Check if user is logged in
      if (!req.session || !req.session.username) {
        return res.status(401).json({ message: "Unauthorized access" });
      }
  
      const username = req.session.username;
  
      const { data: reservationList, error } = await supabase
        .from('reservation')
        .select('*')
        .eq('reserved_by', username)
        .order('id', { ascending: false });
  
      if (error) {
        console.error("Error fetching reservations:", error);
        return res.status(500).json({ message: "Error fetching reservations" });
      }
  
      if (!reservationList || !reservationList.length) {
        return res.status(404).json({ message: "Reservation not found" });
      }
  
      res.json(reservationList);
    } catch (e) {
      console.error("Error in getReservationByUsername:", e);
      res.status(500).json({ message: e.message });
    }
  };

  
  exports.getAllReservations = async (req, res) => {
    try {
        // Get all reservations from the reservation table
        const { data: reservationList, error } = await supabase
          .from('reservation')
          .select('*');

        if (error) {
          console.error("Error fetching reservations:", error);
          return res.status(500).json({ message: "Error fetching reservations" });
        }

        res.json(reservationList || []);
    } catch (e) {
        console.error("Error in getAllReservations:", e);
        res.status(500).json({ message: e.message });
    }
};

exports.updateReservation = async (req, res) => {
  try {
      const { date, username, start_time, end_time } = req.body;

      // Prepare update data
      const updateData = {};
      if (req.body.newDate) {
          updateData.date = req.body.newDate;
      }
      if (req.body.newStartTime) {
          updateData.start_time = req.body.newStartTime;
      }
      if (req.body.newEndTime) {
          updateData.end_time = req.body.newEndTime;
      }

      // Update the reservation
      const { data: updatedReservation, error } = await supabase
        .from('reservation')
        .update(updateData)
        .match({
          date: date,
          reserved_by: username,
          start_time: start_time,
          end_time: end_time
        })
        .select()
        .single();

      if (error) {
        console.error("Error updating reservation:", error);
        return res.status(500).json({ message: 'Error updating reservation' });
      }

      if (!updatedReservation) {
        return res.status(404).json({ message: 'Reservation not found' });
      }

      res.status(200).json({ message: 'Reservation updated successfully', reservation: updatedReservation });
  } catch (error) {
      console.error("Error in updateReservation:", error);
      res.status(500).json({ message: 'Internal server error' });
  }
};