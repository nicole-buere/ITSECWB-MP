 
function getSelectedSeat() {
    // Get all radio button elements with the name "selected_seat"
    const seatRadios = document.querySelectorAll('input[name="selected_seat"]:checked');

    // Iterate over the selected radio buttons
    for (const radio of seatRadios) {
        // Return the ID of the selected radio button
        alert(radio.value)
    }

    // Return null if no radio button is selected
    return null;
}



// Function to generate date options starting from today
function generateDateOptions() {
    const select = document.getElementById('dates');
    
    // Get today's date in local timezone
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    


    for (let i = 0; i < 8; i++) {
        const date = new Date(todayLocal);
        date.setDate(todayLocal.getDate() + i);

        const option = document.createElement('option');
        option.value = date.toISOString().split('T')[0];
        option.textContent = date.toDateString();
        
        // Set today as the default selected option
        if (i === 0) {
            option.selected = true;
        }
        
        select.appendChild(option);
    }
}

// Function to generate time options with 1-hour intervals for start time and 30-minute intervals for end time
function generateTimeOptions() {
    const selectStartTime = document.getElementById('start_time');
    const selectEndTime = document.getElementById('end_time');

    const startTime = new Date();
    startTime.setHours(8, 0, 0); // Set start time to 8:00 AM

    const endTime = new Date();
    endTime.setHours(18, 0, 0); // Set end time to 6:00 PM

    const intervalStart = 60 * 60 * 1000; // 1 hour in milliseconds
    const intervalEnd = 30 * 60 * 1000; // 30 minutes in milliseconds

    let firstStartTime = true;
    let firstEndTime = true;

    while (startTime < endTime) {
        // Add start time option
        const startOption = document.createElement('option');
        startOption.value = startTime.toTimeString().split(' ')[0];
        startOption.textContent = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Set first start time as default
        if (firstStartTime) {
            startOption.selected = true;
            firstStartTime = false;
        }
        
        selectStartTime.appendChild(startOption);

        // Check if adding another interval will exceed the end time
        if (startTime.getTime() + intervalEnd <= endTime.getTime()) {
            // Add end time option
            const endTimeAdjusted = new Date(startTime.getTime() + intervalEnd);
            const endOption = document.createElement('option');
            endOption.value = endTimeAdjusted.toTimeString().split(' ')[0];
            endOption.textContent = endTimeAdjusted.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Set first end time as default
            if (firstEndTime) {
                endOption.selected = true;
                firstEndTime = false;
            }
            
            selectEndTime.appendChild(endOption);
        }

        // Move to the next hour for start time
        startTime.setTime(startTime.getTime() + intervalStart);
    }
}

generateDateOptions();
generateTimeOptions();



// Declare global variable to store last clicked seat ID
let lastClickedSeatId = null;

// Function to toggle seat status
function toggleSeatStatus(seatId) {
    const seat = document.getElementById(seatId);

    // Check if the seat is available and not taken
    if (seat.src.includes('available.png') && !seat.src.includes('taken.png')) {
        // Deselect the previously selected seat if any
        if (lastClickedSeatId !== null) {
            const previousSelectedSeat = document.getElementById(lastClickedSeatId);
            previousSelectedSeat.src = '/assets/available.png';
        }
        // Set lastClickedSeatId to the current seatId
        lastClickedSeatId = seatId;
        // Change image to selected.png
        seat.src = '/assets/selected.png';
    } else if (seat.src.includes('selected.png')) {
        // Deselect the seat if it is already selected
        lastClickedSeatId = null;
        // Change image back to available.png
        seat.src = '/assets/available.png';
    }
    // Update the value of the hidden input field with the ID of the last clicked seat
    document.getElementById('selected-seat').value = lastClickedSeatId || '';
    
    // Update button states when seat selection changes
    updateButtonStates();
}

//Function to show the pop up
function showPopup(seatId) {
    const popup = document.getElementById(`popup-${seatId}`);
    popup.style.display = 'block' ? 'none' : 'block';
}

// Function to hide popup
function hidePopup(seatId) {
    const popup = document.getElementById(`popup-${seatId}`);
    popup.style.display = 'none';
}

// Function to check seat availability for a specific date and time
async function checkSeatAvailability() {
    const date = document.getElementById('dates').value;
    const start_time = document.getElementById('start_time').value;
    const end_time = document.getElementById('end_time').value;
    const labId = document.getElementById('lab_database_id').value;



    // Enhanced input validation
    if (!date) {
        alert('All fields must be filled. Please select a date first.');
        document.getElementById('dates').focus();
        return;
    }
    
    if (!start_time) {
        alert('All fields must be filled. Please select a start time first.');
        document.getElementById('start_time').focus();
        return;
    }
    
    if (!end_time) {
        alert('All fields must be filled. Please select an end time first.');
        document.getElementById('end_time').focus();
        return;
    }
    
    // Validate that end time is after start time
    if (start_time >= end_time) {
        alert('All fields must be filled. End time must be after start time.');
        document.getElementById('end_time').focus();
        return;
    }

    try {
        // Make a request to check seat availability
        // Use lab name (A, B, C) instead of numeric ID
        const response = await fetch(`/api/labs/check-availability/${labId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date,
                start_time: start_time.split(':').slice(0, 2).join(':'),
                end_time: end_time.split(':').slice(0, 2).join(':')
            })
        });

        if (response.ok) {
            const availabilityData = await response.json();
            
            // Update seat display based on availability
            updateSeatDisplay(availabilityData.availableSeats, availabilityData.reservedSeats);
            
            // Show success message
            alert(`Availability checked! ${availabilityData.availableSeats.length} seats available for the selected time.`);
        } else {
            const errorData = await response.json();
            console.error('Failed to check availability:', errorData);
            alert(`Failed to check availability: ${errorData.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error checking seat availability:', error);
        alert('Error checking seat availability. Please try again.');
    }
}

// Function to check if form is valid for availability check
function isFormValidForAvailability() {
    const date = document.getElementById('dates').value;
    const start_time = document.getElementById('start_time').value;
    const end_time = document.getElementById('end_time').value;
    
    return date && start_time && end_time && start_time < end_time;
}

// Function to update button states based on form validity
function updateButtonStates() {
    const checkAvailabilityBtn = document.getElementById('check_availability');
    const reserveBtn = document.getElementById('reserve-button');
    
    if (checkAvailabilityBtn) {
        const isAvailableValid = isFormValidForAvailability();
        checkAvailabilityBtn.disabled = !isAvailableValid;
        checkAvailabilityBtn.style.opacity = isAvailableValid ? '1' : '0.6';
        checkAvailabilityBtn.style.cursor = isAvailableValid ? 'pointer' : 'not-allowed';
    }
    
    if (reserveBtn) {
        let isReserveValid = isFormValidForAvailability() && lastClickedSeatId;
        
        // Additional check for admin reservations - ensure username is filled
        const reserveFor = document.getElementById('reserveFor');
        if (reserveFor && reserveFor.value.trim() === '') {
            isReserveValid = false;
        }
        
        reserveBtn.disabled = !isReserveValid;
        reserveBtn.style.opacity = isReserveValid ? '1' : '0.6';
        reserveBtn.style.cursor = isReserveValid ? 'pointer' : 'not-allowed';
    }
}

// Function to initialize seat display based on server-side data
function initializeSeatDisplay() {
    // Get all seat elements
    const allSeats = document.querySelectorAll('.seat');
    
    allSeats.forEach(seat => {
        // Check if the seat is initially marked as taken (has taken.png image)
        if (seat.src.includes('taken.png')) {
            seat.onclick = null; // Remove click functionality
            seat.style.cursor = 'not-allowed';
            seat.alt = 'Taken Seat';
        } else {
            // Seat is available
            seat.onclick = function() { toggleSeatStatus(seat.id); };
            seat.style.cursor = 'pointer';
            seat.alt = 'Available Seat';
        }
    });
}



// Function to update seat display based on availability
function updateSeatDisplay(availableSeats, reservedSeats) {
    // Reset all seats to available first
    const allSeats = document.querySelectorAll('.seat');
    allSeats.forEach(seat => {
        seat.src = '/assets/available.png';
        seat.onclick = function() { toggleSeatStatus(seat.id); };
        seat.style.cursor = 'pointer';
        seat.alt = 'Available Seat';
    });

    // Mark reserved seats as taken
    reservedSeats.forEach(seatId => {
        const seat = document.getElementById(seatId.toString());
        if (seat) {
            seat.src = '/assets/taken.png';
            seat.onclick = null; // Remove click functionality for taken seats
            seat.style.cursor = 'not-allowed';
            seat.alt = 'Taken Seat';
        }
    });

    // Reset selection if the selected seat is now taken
    if (lastClickedSeatId && reservedSeats.includes(parseInt(lastClickedSeatId))) {
        lastClickedSeatId = null;
        document.getElementById('selected-seat').value = '';
    }
    
    // Update button states after seat display changes
    updateButtonStates();
}



function navigateTo(url) {
    window.location.href = url;
}
 //when button is hovered, background color changes
document.querySelector('.reserve-button').addEventListener('mouseover', function() {
this.style.backgroundColor = 'light';
});

document.querySelector('.reserve-button').addEventListener('mouseout', function() {
this.style.backgroundColor = '';
}); 


document.addEventListener('DOMContentLoaded', () => {
    // Fetch request to retrieve the lab details 

    const reserve_button = document.querySelector('.reserve-button');
    const check_availability_button = document.querySelector('#check_availability');

    // Add event listener for check availability button
    if (check_availability_button) {
        check_availability_button.addEventListener('click', checkSeatAvailability);
    }
    
    // Add event listeners to form fields for real-time validation
    const dateSelect = document.getElementById('dates');
    const startTimeSelect = document.getElementById('start_time');
    const endTimeSelect = document.getElementById('end_time');
    const reserveForInput = document.getElementById('reserveFor');
    
    if (dateSelect) {
        dateSelect.addEventListener('change', updateButtonStates);
    }
    
    if (startTimeSelect) {
        startTimeSelect.addEventListener('change', updateButtonStates);
    }
    
    if (endTimeSelect) {
        endTimeSelect.addEventListener('change', updateButtonStates);
    }
    
    // Add event listener for admin reserve for field
    if (reserveForInput) {
        reserveForInput.addEventListener('input', updateButtonStates);
    }
    
    // Initialize button states
    updateButtonStates();
    
    // Initialize seat display based on server-side data
    initializeSeatDisplay();
    
    // Automatically check seat availability when page loads
    // This ensures seats are properly marked as taken/available
    setTimeout(() => {
        if (isFormValidForAvailability()) {
            checkSeatAvailability();
        }
    }, 500);





    reserve_button.addEventListener('click', async (e) => {
        e.preventDefault(); // Prevent form submission
        

        
        const selected_seat = lastClickedSeatId;
        const date = document.getElementById('dates').value;
        let start_time = document.getElementById('start_time').value;
        let end_time = document.getElementById('end_time').value;

        // Validate that a seat is selected
        if (!selected_seat) {
            alert('All fields must be filled. Please select a seat first.');
            return;
        }

        // Validate that the selected seat is not taken
        const selectedSeatElement = document.getElementById(selected_seat);
        if (selectedSeatElement && selectedSeatElement.src.includes('taken.png')) {
            alert('Cannot reserve a seat that is already taken. Please select a different seat.');
            return;
        }

        // Enhanced validation for date and times
        if (!date) {
            alert('All fields must be filled. Please select a date first.');
            document.getElementById('dates').focus();
            return;
        }
        
        if (!start_time) {
            alert('All fields must be filled. Please select a start time first.');
            document.getElementById('start_time').focus();
            return;
        }
        
        if (!end_time) {
            alert('All fields must be filled. Please select an end time first.');
            document.getElementById('end_time').focus();
            return;
        }
        
        // Validate that end time is after start time
        if (start_time >= end_time) {
            alert('All fields must be filled. End time must be after start time.');
            document.getElementById('end_time').focus();
            return;
        }

        start_time = start_time.split(':').slice(0, 2).join(':');
        end_time = end_time.split(':').slice(0, 2).join(':');

        const labId = document.getElementById('lab_database_id').value;
        const labName = document.getElementById('lab_id').textContent;

        const seatId = parseInt(selected_seat);
        
        // Final check: verify the seat is still available before submitting
        if (selectedSeatElement && selectedSeatElement.src.includes('taken.png')) {
            alert('The selected seat is no longer available. Please refresh the page and select a different seat.');
            return;
        }

        const reserveFor = document.getElementById('reserveFor');

        if (reserveFor != null) {
            const user_name = reserveFor.value;
            
            if (!user_name) {
                alert('All fields must be filled. Please enter a username for the reservation.');
                return;
            }
            
            const requestBody = {
                date,
                start_time,
                end_time,
                seatNumber: seatId,
                user_name
            };
            
            try {
                // Use lab name (A, B, C) instead of numeric ID
                const response = await fetch(`/api/labs/adminreserve/${labId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
                
                if (response.ok) {
                    const responseData = await response.json();
                    alert('Reservation successful');
                    window.location.href = '/home';
                } else {
                    const errorData = await response.json();
                    console.error('Admin reservation failed:', errorData);
                    alert(`Failed to reserve seat: ${errorData.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Network error during admin reservation:', error);
                alert('Error making reservation. Please try again.');
            }
        } else {
            const requestBody = { date, start_time, end_time, seatNumber: seatId };
            
            try {
                // Use lab name (A, B, C) instead of numeric ID
                const response = await fetch(`/api/labs/reserve/${labId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
            
                // Check if the reservation was successful
                if (response.ok) {
                    const responseData = await response.json();
                    // Redirect to the home page
                    alert("Reservation successful");
                    window.location.href = '/home';
                } else {
                    // Handle errors or show a message to the user
                    const data = await response.json();
                    console.error('Regular reservation failed:', data);
                    alert(`Failed to reserve seat: ${data.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Network error during regular reservation:', error);
                alert('Error making reservation. Please try again.');
            }
        }
    });
});


