const { createClient } = require('@supabase/supabase-js');

// It's crucial to use the SERVICE_KEY for backend operations
// to bypass Row Level Security when needed for administrative tasks.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Service Key is missing from .env file');
  // Exit or throw an error to prevent the app from running without proper config
  process.exit(1); 
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
