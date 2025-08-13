document.addEventListener('DOMContentLoaded', () => {
   
    const edit_form = document.getElementById('edit_form');
    const update = document.getElementById('reserve-button');


function getUrlParams() {
    const pathSegments = window.location.pathname.split('/').filter(segment => segment !== ''); // Split the path and remove empty segments
    const labId = pathSegments[1];
    const seatNumber = pathSegments[2];
    const date = pathSegments[3];
    const startTime = pathSegments[4];
    const endTime = pathSegments[5];
    const reservedBy = pathSegments[6];



    return { labId, seatNumber, date, startTime, endTime, reservedBy };
}

    


// Function to generate date options for the next 7 days
function generateDateOptions() {
    const select = document.getElementById('dates');
    const today = new Date();

    for (let i = 0; i < 8; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        const option = document.createElement('option');
        option.value = date.toISOString().split('T')[0];
        option.textContent = date.toDateString();
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

    while (startTime < endTime) {
        // Add start time option
        const startOption = document.createElement('option');
        startOption.value = startTime.getHours().toString().padStart(2, '0') + ':' + startTime.getMinutes().toString().padStart(2, '0');
        startOption.textContent = startTime.getHours().toString().padStart(2, '0') + ':' + startTime.getMinutes().toString().padStart(2, '0');
        selectStartTime.appendChild(startOption);

        // Check if adding another interval will exceed the end time
        if (startTime.getTime() + intervalEnd <= endTime.getTime()) {
            // Add end time option
            const endTimeAdjusted = new Date(startTime.getTime() + intervalEnd);
            const endOption = document.createElement('option');
            endOption.value = endTimeAdjusted.getHours().toString().padStart(2, '0') + ':' + endTimeAdjusted.getMinutes().toString().padStart(2, '0');
            endOption.textContent = endTimeAdjusted.getHours().toString().padStart(2, '0') + ':' + endTimeAdjusted.getMinutes().toString().padStart(2, '0');
            selectEndTime.appendChild(endOption);
        }

        // Move to the next hour for start time
        startTime.setTime(startTime.getTime() + intervalStart);
    }
}


generateDateOptions();
generateTimeOptions();


update.addEventListener('click', async (e) => {
    e.preventDefault();

    // Retrieve values from input fields
    const newdate = document.getElementById('dates').value;
    const newstartTime = document.getElementById('start_time').value;
    const newendTime = document.getElementById('end_time').value;

    const { labId, seatNumber, date, startTime, endTime, reservedBy } = getUrlParams();



    const response = await fetch('/api/labs/updateProfile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            newDate: newdate,
            newStart: newstartTime,
            newEndTime: newendTime,
            labId: labId,
            seatNumber: parseInt(seatNumber),
            date: date,
            start_time: startTime,
            end_time: endTime,
            reserved_by: reservedBy
        })
    })

    if (response.ok) {
        alert("Reservation updated successfully!");
        window.location.href = '/reserve';
    } else {
        const errorMessage = await response.text();
        alert(`Failed to update reservation: ${errorMessage}`);
    }
    // redirect to /reservations
});



});