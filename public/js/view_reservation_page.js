document.addEventListener('DOMContentLoaded', () => {

    const editRes = document.getElementById('editReservationButton');
    const deleteRes = document.getElementById('cancelReservationButton');

    // Attach event listener to the delete button
    deleteRes.addEventListener('click', async (e) => {
        e.preventDefault();

        // Retrieve selected row data
        const rowData = getSelectedRowData();

        const lab_id = rowData.lab_id
        const seatNumber = rowData.seatNumber
        const date = rowData.date
        const start_time = rowData.start_time
        const end_time = rowData.end_time
        const username = rowData.reserved_by



        if (!rowData) {
            alert("Please select a reservation to delete");
            return;
        }
        try {
                const labResponse = await fetch('/api/labs/deleteFromLab', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        lab_name: lab_id,
                        seatNumber: seatNumber,
                        date: date,
                        start_time: start_time,
                        end_time: end_time,
                        username: username
                    })
                })
                .then(response => response.json())
                .then(async data => {
                    const resRespomse = await fetch('/api/labs/delete', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            date: date,
                            start_time: start_time,
                            end_time: end_time,
                            lab_id: lab_id,
                            reserved_by: username,
                            seatNumber: seatNumber
                        })
                    })
                    .then(response => {
                        if (response.ok) {
                            alert('Reservation cancelled successfully');
                            window.location.reload();
                        } else {
                            alert('An error occurred while cancelling reservation. Please try again later.');
                        }
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                        alert('An error occurred while cancelling reservation. Please try again later.');
                    });
                })
                .catch((error) => {
                    console.error('Error:', error);
                    alert('An error occurred while cancelling reservation. Please try again later.');
                });
        } catch (error) {   
            console.error('Error:', error);
            alert('An error occurred while cancelling reservation. Please try again later.');
        }
        
    });

    
    
    // Function to retrieve data from the selected row
    function getSelectedRowData() {
        // Find the selected row
        const selectedRow = document.querySelector(".selected");

        // Check if a row is selected
        if (selectedRow) {
            // Retrieve data from the selected row
            return {
                date_of_reservation: selectedRow.cells[2].textContent,
                start_time: selectedRow.cells[3].textContent,
                end_time: selectedRow.cells[4].textContent,
                lab_name: selectedRow.cells[0].textContent,
                reserved_by: selectedRow.cells[5].textContent.trim(),
                seat_num: selectedRow.cells[1].textContent,
            };
        } else {
            // If no row is selected, return null
            return null;
        }
    }

    // Event listener for the edit reservation button
    editReservationButton.addEventListener('click', function() {
        // Retrieve selected row data
        const rowData = getSelectedRowData();

        // Check if a row is selected
        if (rowData) {


            // Now you can use rowData for further processing like editing the reservation
        } else {
            alert("Please select a reservation to edit");
        }
    });

    // Get all the rows in the table
    const rows = document.querySelectorAll(".reservations-table tbody tr");

    // Event listener for each row
    rows.forEach(function(row) {
        row.addEventListener('click', function() {
            // Remove the 'selected' class from all rows
            rows.forEach(function(row) {
                row.classList.remove("selected");
            });
            
            // Add the 'selected' class to the clicked row
            row.classList.add("selected");

            // Retrieve data from the selected row
            const rowData = {
                lab_name: row.cells[0].textContent,
                seat_num: row.cells[1].textContent,
                date_of_reservation: row.cells[2].textContent,
                start_time: row.cells[3].textContent,
                end_time: row.cells[4].textContent,
                reservationName: row.cells[5].textContent
            };

            // Now you can use rowData for further processing like editing or deleting the reservation
        });
    });

        // Event listener for the edit reservation button
    editReservationButton.addEventListener('click', function() {
        // Retrieve selected row data
        const rowData = getSelectedRowData();

        // Check if a row is selected
        if (rowData) {
            // Redirect to the edit reservation page with query parameters
            window.location.href = `/editReservation/${rowData.lab_name}/${rowData.seat_num}/${rowData.date_of_reservation}/${rowData.start_time}/${rowData.end_time}/${rowData.reserved_by}`;

        } else {
            alert("Please select a reservation to edit");
        }
    });

});