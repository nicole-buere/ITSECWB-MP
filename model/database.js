
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables. Please check your .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error) {
            console.error("Error testing Supabase connection:", error);
            console.error("Error details:", {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            return false;
        }
        
        console.log("Successfully connected to Supabase");
        
        // Test if the reservation table exists
        const { data: reservationTest, error: reservationError } = await supabase
            .from('reservation')
            .select('count')
            .limit(1);
            
        if (reservationError) {
            console.error("Error accessing reservation table:", reservationError);
        }
        
        // Test if the lab table exists
        const { data: labTest, error: labError } = await supabase
            .from('lab')
            .select('count')
            .limit(1);
            
        if (labError) {
            console.error("Error accessing lab table:", labError);
        }
        
        // Test if the lab_seats table exists
        const { data: seatsTest, error: seatsError } = await supabase
            .from('lab_seats')
            .select('count')
            .limit(1);
            
        if (seatsError) {
            console.error("Error accessing lab_seats table:", seatsError);
        }
        
        return true;
    } catch (err) {
        console.error("Error connecting to Supabase:", err);
        console.error("Error stack:", err.stack);
        return false;
    }
}

module.exports = {
    supabase,
    testSupabaseConnection
};