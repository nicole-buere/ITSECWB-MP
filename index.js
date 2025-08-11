const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const hbs = require('hbs');
const userRoutes = require('./routes/userRoutes.js');
const labroutes = require('./routes/labRoutes.js');
const { supabase, testSupabaseConnection } = require('./model/database.js');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
//fixing css
app.use(express.static('public'));

app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));


// Test Supabase connection
testSupabaseConnection();

// Use body-parser middleware
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
    session({
      secret: 'apdev123',
      resave: false,
      saveUninitialized: true,
    })
);

// API Endpoints
app.use('/api/users', userRoutes);
app.use('/api/labs', labroutes);





// For handlebars 
hbs.registerHelper('getReservationDate', function(reservations, desiredDate, current_time) {
    for (let i = 0; i < reservations.length; i++) {
        const reservation = reservations[i];
        if (reservation.date === desiredDate) {
            if (current_time >= reservation.start_time && current_time <= reservation.end_time) {
                return true;
            }
        }
    }
    return false;
});

// Register eq helper for comparing values in templates
hbs.registerHelper('eq', function(a, b) {
    return a === b;
});

// Handle GET request to the root route (index page)
app.get('/', (req, res) => {
  if (req.session.authenticated) {
     res.redirect('/home');
  } else {
    res.render('index', { title: 'Labyrinth - Login Page' });
    }
});

//Handle GET request to the /register router (register-account)
app.get('/register', (req, res) => {
    res.render('register-account', { title: 'Labyrinth - Register Account' });
});



// Handle post request to the /home route
// Update your /home route handler
app.get('/home', (req, res) => {
    if (req.session.authenticated) {
        res.render('homepage', { title: 'Labyrinth - Home Page', username: req.session.username });
    } else {
        res.status(401).render('error_page', {
            title: 'Unauthorized Access',
            errorCode: '401',
            errorTitle: 'Unauthorized Access',
            errorMessage: 'You need to log in to access this page.',
            errorDescription: 'This page requires authentication. Please log in with your account credentials.',
            showLogin: true
        });
    }
});


// Handle GET request to the /profile route
//for viewing to b editted pa hehe
app.get('/profile', async (req, res) => {
    try {
        const username = req.session.username; 
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (userError) {
            console.error("Error fetching user:", userError);
            return res.status(500).render('error_page', {
                title: 'Internal Server Error',
                errorCode: '500',
                errorTitle: 'Internal Server Error',
                errorMessage: 'Something went wrong while fetching user data.',
                errorDescription: 'We encountered an issue while retrieving your profile information. Please try again later.',
                showLogin: false
            });
        }

        if (user) {
            if (user.role == 'student'){
                const { data: Reservation, error: resError } = await supabase
                    .from('reservation')
                    .select('*')
                    .eq('reserved_by', user.username);


                console.log("User Reservations:", Reservation); // Log the reservations to the console

                res.render('profile_edit', {
                    title: 'Labyrinth - Profile Page', 
                    user: user, // Pass the user object to the template
                    Reservation: Reservation 
                });


            } else {

                const { data: Reservation, error: resError } = await supabase
                    .from('reservation')
                    .select('*')
                    .eq('reserved_by', user.username);


                console.log("User Reservations:", Reservation); // Log the reservations to the console

                res.render('profile_edit', {
                    title: 'Labyrinth - Profile Page', 
                    user: user, // Pass the user object to the template
                    Reservation: Reservation 
                });
            }
            
            
        } else {
            // Handle case where user is not found (optional)
            res.status(404).render('error_page', {
                title: 'User Not Found',
                errorCode: '404',
                errorTitle: 'User Not Found',
                errorMessage: 'The user profile you\'re looking for doesn\'t exist.',
                errorDescription: 'The user may have been deleted or the username may be incorrect.',
                showLogin: false
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).render('error_page', {
            title: 'Internal Server Error',
            errorCode: '500',
            errorTitle: 'Internal Server Error',
            errorMessage: 'Something went wrong while processing your request.',
            errorDescription: 'We encountered an issue while retrieving your profile. Please try again later.',
            showLogin: false
        });
    }
}); 



//for viewing commented out const etc. 
app.get('/edittprofile', async (req, res) => {
    try {
        const username = req.session.username; 
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (user) {
            
            //console.log("User Reservations:", Reservation); // Log the reservations to the console

            res.render('profile_editting_page', {
                title: 'Labyrinth - Edit Profile Page', 
                user: user, // Pass the user object to the template
            });
        } else {
            // Handle case where user is not found (optional)
            res.status(404).render('error_page', {
                title: 'User Not Found',
                errorCode: '404',
                errorTitle: 'User Not Found',
                errorMessage: 'The user profile you\'re looking for doesn\'t exist.',
                errorDescription: 'The user may have been deleted or the username may be incorrect.',
                showLogin: false
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).render('error_page', {
            title: 'Internal Server Error',
            errorCode: '500',
            errorTitle: 'Internal Server Error',
            errorMessage: 'Something went wrong while processing your request.',
            errorDescription: 'We encountered an issue while retrieving your profile. Please try again later.',
            showLogin: false
        });
    }
});
app.get('/reserve', async (req, res) => {
    if (req.session.authenticated) {
        try {
            const username = req.session.username;
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();
            
            if (userError) {
                console.error("Error fetching user:", userError);
                return res.status(500).json({ message: 'Internal server error' });
            }
            
            if (user) {
                let Reservation;

                if (user.role === 'student') {
                    const { data: userReservations, error: resError } = await supabase
                        .from('reservation')
                        .select('*')
                        .eq('reserved_by', user.username);
                    Reservation = userReservations;
                    console.log("User Reservations:", Reservation); // Log the reservations to the console
     
                    res.render('reservations_current', {
                        title: 'Labyrinth - Current Reservations Page',
                        user: user, // Pass the user object to the template
                        Reservation: Reservation
                    });

                } else {
                    const { data: allReservations, error: resError } = await supabase
                        .from('reservation')
                        .select('*');
                    Reservation = allReservations;

                    console.log("User Reservations:", Reservation); // Log the reservations to the console

                    res.render('reservations_current', {
                        title: 'Labyrinth - Current Reservations Page',
                        user: user, // Pass the user object to the template
                        Reservation: Reservation
                    });
                }
            } else {
                res.status(404).json({ message: 'User not found' });
            }
        } catch (error) {
            console.error("Error fetching reservations:", error);
            res.status(500).render('error_page', {
                title: 'Internal Server Error',
                errorCode: '500',
                errorTitle: 'Internal Server Error',
                errorMessage: 'Something went wrong while fetching reservations.',
                errorDescription: 'We encountered an issue while retrieving your reservation data. Please try again later.',
                showLogin: false
            });
        }
    } else {
        res.status(401).render('error_page', {
            title: 'Unauthorized Access',
            errorCode: '401',
            errorTitle: 'Unauthorized Access',
            errorMessage: 'You need to log in to access this page.',
            errorDescription: 'This page requires authentication. Please log in with your account credentials.',
            showLogin: true
        });
    }
});

// Handle GET request to the /profile route
//for viewing commented out const etc.
app.get('/viewprofile', async (req, res) => {
    try {
        const username = req.query.username;
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (userError) {
            console.error("Error fetching user:", userError);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (user) {
            const { data: Reservation, error: resError } = await supabase
                .from('reservation')
                .select('*')
                .eq('reserved_by', user.username);
            console.log("User Reservations:", Reservation); // Log the reservations to the console

            res.render('profile_view', {
                title: 'Labyrinth - View Profile Page',
                user: user,
                Reservation: Reservation
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error("Error fetching reservations:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



// Handle GET request to the /reserve route


//for viewing commented out const etc.

app.post('/reservation/:labId', async (req, res) => {
    if (req.session.authenticated) {
        try {
            const { data: lab, error: labError } = await supabase
                .from('labs')
                .select('*')
                .eq('name', req.params.labId)
                .single();

            if (!lab) {
                return res.status(404).json({ message: 'Lab not found' });
            }

            const currentDate = new Date();
        
            const currentDateStr = currentDate.toISOString().split('T')[0]; // Extract date part

            // Extract current hours and minutes
            const currentHours = currentDate.getHours().toString().padStart(2, '0'); // Ensure two digits with leading zero
            const currentMinutes = currentDate.getMinutes().toString().padStart(2, '0'); // Ensure two digits with leading zero

            const currentTime = `${currentHours}:${currentMinutes}`; // Construct the current time string

            //const dates = req.body.dates || 0;

            // Assuming dates is in ISO string format (YYYY-MM-DD)
            const dates = req.body.dates ? new Date(req.body.dates) : new Date(); // Parse the date or use today's date if not provided

            const checkdate = dates.toISOString().split('T')[0];

            if (checkdate != currentDateStr){
                dates.setDate(dates.getDate() + 1);            
            }
                

            const updatedDate = dates.toISOString().split('T')[0];

            
            
            // Add one day to the date
            

            let start_time = req.body.start_time || 0;
            let end_time = req.body.end_time || 0; 

           const anonymous = req.body.anon_checkbox || 'false';
           // document.getElementById('anon-checkbox').value;



            if (start_time != 0 && end_time != 0) {
                start_time = start_time.split(':').slice(0, 2).join(':');
                end_time = end_time.split(':').slice(0, 2).join(':');
            }

        

            const selectedLab = req.params.labId; // Access lab ID from route parameters

            // Pass the currentDate as date to the template

            if (dates != null && start_time != null && end_time != null) {
                res.render('reserve/reservation', {
                    title: 'Reserve a Seat',
                    username: req.session.username,
                    labId: selectedLab,
                    lab: lab,
                    date: updatedDate, // Pass the currentDate to the template
                    currentTime: start_time,
                    start_time: start_time,
                    end_time: end_time,
                    admin_status: req.session.admin
                   // anonymous: anonymous
                    
                });
            }else {
                res.render('reserve/reservation', {
                    title: 'Reserve a Seat',
                    username: req.session.username,
                    labId: selectedLab,
                    lab: lab,
                    date: currentDateStr, // Pass the currentDate to the template
                    currentTime: currentTime,
                    admin_status: req.session.admin
                });
            }

        } catch (err) {
            console.error(err);
            res.status(500).render('error_page', {
                title: 'Internal Server Error',
                errorCode: '500',
                errorTitle: 'Internal Server Error',
                errorMessage: 'Something went wrong while processing your reservation.',
                errorDescription: 'We encountered an issue while processing your reservation request. Please try again later.',
                showLogin: false
            });
        }
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
});





//Handle GET request to the /resconfirmation route
app.get('/editReservation/:labId/:seatNumber/:date/:start_time/:end_time/:reserved_by', (req, res) => {
    if (req.session.authenticated) {
        // Retrieve route parameters from the request
        const { labId, seatNumber, date, start_time, end_time, reserved_by } = req.params;
        
        // Render the edit reservation page with the route parameters passed to it
        res.render('editReservation', { title: 'Edit Reservation', labId, seatNumber, date, start_time, end_time, reserved_by });
    } else {
        // Unauthorized access
        res.status(401).render('error_page', {
            title: 'Unauthorized Access',
            errorCode: '401',
            errorTitle: 'Unauthorized Access',
            errorMessage: 'You need to log in to access this page.',
            errorDescription: 'This page requires authentication. Please log in with your account credentials.',
            showLogin: true
        });
    }
});


app.get('/about', (req, res) => {
        res.render('about', { title: 'Labyrinth - About Us'});
});

// Error handling routes
app.get('/error/:code', (req, res) => {
    const errorCode = req.params.code;
    let errorData = {
        title: 'Error',
        errorCode: errorCode,
        errorTitle: 'Something went wrong',
        errorMessage: 'An unexpected error occurred.',
        errorDescription: 'We encountered an issue while processing your request.',
        showLogin: false
    };

    switch(errorCode) {
        case '404':
            errorData.errorTitle = 'Page Not Found';
            errorData.errorMessage = 'The page you\'re looking for doesn\'t exist.';
            errorData.errorDescription = 'The URL you entered may be incorrect or the page may have been moved or deleted.';
            break;
        case '403':
            errorData.errorTitle = 'Access Forbidden';
            errorData.errorMessage = 'You don\'t have permission to access this resource.';
            errorData.errorDescription = 'This page requires special permissions or you may need to log in with a different account.';
            errorData.showLogin = true;
            break;
        case '500':
            errorData.errorTitle = 'Internal Server Error';
            errorData.errorMessage = 'Something went wrong on our end.';
            errorData.errorDescription = 'We\'re experiencing technical difficulties. Please try again later or contact support if the problem persists.';
            break;
        case '401':
            errorData.errorTitle = 'Unauthorized Access';
            errorData.errorMessage = 'You need to log in to access this page.';
            errorData.errorDescription = 'This page requires authentication. Please log in with your account credentials.';
            errorData.showLogin = true;
            break;
        case '502':
            errorData.errorTitle = 'Bad Gateway';
            errorData.errorMessage = 'We\'re having trouble connecting to our services.';
            errorData.errorDescription = 'Our servers are experiencing connectivity issues. Please try again in a few minutes.';
            break;
        case '503':
            errorData.errorTitle = 'Service Unavailable';
            errorData.errorMessage = 'Our service is temporarily unavailable.';
            errorData.errorDescription = 'We\'re currently performing maintenance or experiencing high traffic. Please check back later.';
            break;
    }

    res.status(parseInt(errorCode)).render('error_page', errorData);
});

// 404 handler for unmatched routes
app.use('*', (req, res) => {
    res.status(404).render('error_page', {
        title: 'Page Not Found',
        errorCode: '404',
        errorTitle: 'Page Not Found',
        errorMessage: 'The page you\'re looking for doesn\'t exist.',
        errorDescription: 'The URL you entered may be incorrect or the page may have been moved or deleted.',
        showLogin: false
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).render('error_page', {
        title: 'Internal Server Error',
        errorCode: '500',
        errorTitle: 'Internal Server Error',
        errorMessage: 'Something went wrong on our end.',
        errorDescription: 'We\'re experiencing technical difficulties. Please try again later or contact support if the problem persists.',
        showLogin: false
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Listening to the server on http://localhost:${port}`);
});
