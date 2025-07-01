// Notification controller for Supabase persistence
const supabase = require('../supabaseClient');

// Save a notification
async function saveNotification({ to, type, message, data }) {
  const { data: result, error } = await supabase
    .from('notifications')
    .insert([{ to, type, message, data }]);
  if (error) throw error;
  return result[0];
}

// Fetch notifications for a user
async function fetchNotifications({ to, limit = 20 }) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('to', to)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[fetchNotifications] Supabase error:', error);
    throw error;
  }
  return data;
}

module.exports = { saveNotification, fetchNotifications };
