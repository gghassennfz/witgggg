const { supabase } = require('../supabaseClient');

// Send mate request by email, username, or code
exports.sendMateRequest = async (req, res) => {
  const fromUserId = req.user.id;
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query' });
  }
  try {
    // Find user by email, username, or code (case-insensitive)
    const { data: toUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .or(`email.ilike.${query},username.ilike.${query},code.eq.${query}`)
      .single();
    if (userError || !toUser) return res.status(404).json({ error: 'User not found' });
    if (toUser.id === fromUserId) return res.status(400).json({ error: 'Cannot add yourself' });
    // Check for existing mate or pending request
    const { data: existing } = await supabase
      .from('mate_requests')
      .select('*')
      .or(`(from_user_id.eq.${fromUserId},to_user_id.eq.${toUser.id})`, `(from_user_id.eq.${toUser.id},to_user_id.eq.${fromUserId})`)
      .in('status', ['pending','accepted']);
    if (existing && existing.length > 0) return res.status(400).json({ error: 'Request already exists or already mates' });
    // Insert request
    const { data, error } = await supabase
      .from('mate_requests')
      .insert([{ from_user_id: fromUserId, to_user_id: toUser.id, status: 'pending' }])
      .select()
      .single();
    if (error) throw error;
    // (Optional) Create notification here
    res.status(201).json({ request: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// List all accepted mates for current user
exports.getMates = async (req, res) => {
  const userId = req.user.id;
  try {
    // Find all accepted mates
    const { data: mates1, error: err1 } = await supabase
      .from('mates')
      .select('mate_id, mate:profiles(id, username, email, avatar_url, code)')
      .eq('user_id', userId);
    const { data: mates2, error: err2 } = await supabase
      .from('mates')
      .select('user_id, user:profiles(id, username, email, avatar_url, code)')
      .eq('mate_id', userId);
    if (err1 || err2) throw err1 || err2;
    // Merge both directions
    const mates = [
      ...(mates1 || []).map(m => m.mate),
      ...(mates2 || []).map(m => m.user)
    ];
    res.json({ mates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// List all pending mate requests for current user
exports.getMateRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    // Requests received
    const { data: received, error: rErr } = await supabase
      .from('mate_requests')
      .select('id, from_user_id, to_user_id, status, created_at, from:profiles!mate_requests_from_user_id_fkey(id, username, code)')
      .eq('to_user_id', userId)
      .eq('status', 'pending');
    // Requests sent
    const { data: sent, error: sErr } = await supabase
      .from('mate_requests')
      .select('id, from_user_id, to_user_id, status, created_at, to:profiles!mate_requests_to_user_id_fkey(id, username, code)')
      .eq('from_user_id', userId)
      .eq('status', 'pending');
    if (rErr || sErr) throw rErr || sErr;
    res.json({ received, sent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Accept/reject a mate request
exports.respondToMateRequest = async (req, res) => {
  const userId = req.user.id;
  const { requestId } = req.params;
  const { action } = req.body; // 'accept' or 'reject'
  if (!['accept','reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
  try {
    // Find request
    const { data: reqData, error: reqErr } = await supabase
      .from('mate_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    if (reqErr || !reqData) return res.status(404).json({ error: 'Request not found' });
    if (reqData.to_user_id !== userId) return res.status(403).json({ error: 'Not authorized' });
    // Update status
    const { error: updateErr } = await supabase
      .from('mate_requests')
      .update({ status: action })
      .eq('id', requestId);
    if (updateErr) throw updateErr;
    // If accepted, add to mates
    if (action === 'accept') {
      await supabase
        .from('mates')
        .insert([
          { user_id: reqData.from_user_id, mate_id: reqData.to_user_id },
          { user_id: reqData.to_user_id, mate_id: reqData.from_user_id }
        ]);
    }
    // (Optional) Notification logic here
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// (Optional) List notifications for current user
exports.getNotifications = async (req, res) => {
  // Placeholder: implement if you want notification system
  res.json({ notifications: [] });
};
