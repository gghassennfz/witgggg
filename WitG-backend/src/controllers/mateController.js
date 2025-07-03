const  supabase  = require('../supabaseClient');

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
      .select('id, mate_requests')
      .or(`email.ilike.${query},username.ilike.${query},user_code.eq.${query}`)
      .single();
    if (userError || !toUser) return res.status(404).json({ error: 'User not found' });
    if (toUser.id === fromUserId) return res.status(400).json({ error: 'Cannot add yourself' });
    // Fetch sender profile
    const { data: fromProfile, error: fromErr } = await supabase
      .from('profiles')
      .select('id, mate_requests')
      .eq('id', fromUserId)
      .single();
    if (fromErr || !fromProfile) return res.status(404).json({ error: 'Sender profile not found' });
    // Check for existing request
    const alreadyRequested = [...(toUser.mate_requests||[]), ...(fromProfile.mate_requests||[])]
      .some(r => (r.sender === fromUserId && r.receiver === toUser.id && r.status === 'pending') || (r.sender === toUser.id && r.receiver === fromUserId && r.status === 'pending'));
    if (alreadyRequested) return res.status(400).json({ error: 'Request already exists or already mates' });
    // Add request to both profiles
    const requestObj = { sender: fromUserId, receiver: toUser.id, status: 'pending', created_at: new Date().toISOString() };
    const { error: updateToErr } = await supabase
      .from('profiles')
      .update({ mate_requests: [...(toUser.mate_requests||[]), requestObj] })
      .eq('id', toUser.id);
    const { error: updateFromErr } = await supabase
      .from('profiles')
      .update({ mate_requests: [...(fromProfile.mate_requests||[]), requestObj] })
      .eq('id', fromUserId);
    if (updateToErr || updateFromErr) throw updateToErr || updateFromErr;
    res.status(201).json({ request: requestObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// List all accepted mates for current user
exports.getMates = async (req, res) => {
  const userId = req.user.id;
  try {
    const { data: me, error } = await supabase
      .from('profiles')
      .select('mates')
      .eq('id', userId)
      .single();
    if (error || !me) throw error;
    // Fetch mate profiles
    let mates = [];
    if (me.mates && me.mates.length > 0) {
      const { data: mateProfiles, error: matesErr } = await supabase
        .from('profiles')
        .select('id, username, email, avatar_url, user_code')
        .in('id', me.mates);
      if (matesErr) throw matesErr;
      mates = mateProfiles || [];
    }
    res.json({ mates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// List all pending mate requests for current user
exports.getMateRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const { data: me, error } = await supabase
      .from('profiles')
      .select('mate_requests')
      .eq('id', userId)
      .single();
    if (error || !me) throw error;
    // Filter requests
    const received = (me.mate_requests || []).filter(r => r.receiver === userId && r.status === 'pending');
    const sent = (me.mate_requests || []).filter(r => r.sender === userId && r.status === 'pending');
    res.json({ received, sent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Accept/reject a mate request
exports.respondToMateRequest = async (req, res) => {
  const userId = req.user.id;
  const { requestId } = req.params; // requestId will be a composite key: sender_receiver_createdAt
  const { action } = req.body; // 'accept' or 'reject'
  if (!['accept','reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
  try {
    // Get own profile
    const { data: me, error: meErr } = await supabase
      .from('profiles')
      .select('mate_requests, mates')
      .eq('id', userId)
      .single();
    if (meErr || !me) throw meErr;
    // Find request by composite key (sender_receiver_createdAt)
    const reqParts = requestId.split('_');
    if (reqParts.length < 3) return res.status(400).json({ error: 'Invalid requestId' });
    const [sender, receiver, created_at] = reqParts;
    let updatedRequests = (me.mate_requests||[]).map(r => {
      if (r.sender === sender && r.receiver === receiver && r.created_at === created_at) {
        return { ...r, status: action === 'accept' ? 'accepted' : 'declined' };
      }
      return r;
    });
    // Update mate_requests in own profile
    let newMates = me.mates || [];
    if (action === 'accept') {
      const mateId = sender === userId ? receiver : sender;
      if (!newMates.includes(mateId)) newMates.push(mateId);
    }
    await supabase
      .from('profiles')
      .update({ mate_requests: updatedRequests, mates: newMates })
      .eq('id', userId);
    // Update mate_requests and mates in the other user's profile
    const otherUserId = sender === userId ? receiver : sender;
    const { data: other, error: otherErr } = await supabase
      .from('profiles')
      .select('mate_requests, mates')
      .eq('id', otherUserId)
      .single();
    if (otherErr || !other) throw otherErr;
    let updatedOtherRequests = (other.mate_requests||[]).map(r => {
      if (r.sender === sender && r.receiver === receiver && r.created_at === created_at) {
        return { ...r, status: action === 'accept' ? 'accepted' : 'declined' };
      }
      return r;
    });
    let otherMates = other.mates || [];
    if (action === 'accept' && !otherMates.includes(userId)) otherMates.push(userId);
    await supabase
      .from('profiles')
      .update({ mate_requests: updatedOtherRequests, mates: otherMates })
      .eq('id', otherUserId);
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
