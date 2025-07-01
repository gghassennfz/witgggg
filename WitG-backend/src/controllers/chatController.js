// Backend Chat Controller for Supabase persistence
const supabase = require('../supabaseClient');

// Save a chat message (direct or group)
async function saveMessage({ from, to, groupId, message }) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ from, to, group_id: groupId, message }]);
  if (error) throw error;
  return data[0];
}

// Fetch chat history (direct or group)
async function fetchMessages({ userA, userB, groupId, limit = 50 }) {
  if (groupId) {
    // Group chat
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data;
  } else {
    // Direct chat
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(from.eq.${userA},to.eq.${userB}),and(from.eq.${userB},to.eq.${userA})`)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data;
  }
}

module.exports = { saveMessage, fetchMessages };
