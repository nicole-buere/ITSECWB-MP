
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
            return false;
        }
        console.log("Connected to Supabase successfully");
        return true;
    } catch (err) {
        console.error("Error connecting to Supabase:", err);
        return false;
    }
}

module.exports = {
    supabase,
    testSupabaseConnection
};