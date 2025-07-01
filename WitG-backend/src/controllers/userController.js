// User controller for fetching users from Supabase
const supabase = require('../supabaseClient');

async function fetchUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email');
  if (error) {
    console.error('[fetchUsers] Supabase error:', error);
    throw error;
  }
  return data;
}

module.exports = { fetchUsers };
