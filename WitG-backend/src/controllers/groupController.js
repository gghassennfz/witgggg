const supabase = require('../services/supabaseClient');

// Get all groups
exports.getAllGroups = async (req, res) => {
  // TODO: This should be secured to only show groups the user is a member of.
  const { data, error } = await supabase.from('groups').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// Create a new group
exports.createGroup = async (req, res) => {
  // TODO: Get user_id from a secure auth middleware, not the request body.
  const { name, description, user_id } = req.body;

  if (!name || !user_id) {
    return res.status(400).json({ error: 'Group name and user_id are required.' });
  }

  // Step 1: Create the group
  const { data: groupData, error: groupError } = await supabase
    .from('groups')
    .insert([{ name, description, created_by: user_id }])
    .select()
    .single();

  if (groupError) return res.status(500).json({ error: groupError.message });

  // Step 2: Add the creator as a group leader
  // In a real-world scenario, this should be a database transaction or an RPC call.
  const { error: memberError } = await supabase
    .from('group_members')
    .insert([{ group_id: groupData.id, user_id: user_id, role: 'leader' }]);

  if (memberError) {
    // Attempt to roll back group creation if member insertion fails
    await supabase.from('groups').delete().eq('id', groupData.id);
    return res.status(500).json({ error: 'Failed to add user to group as leader.' });
  }

  res.status(201).json(groupData);
};

// Get a single group by ID
exports.getGroupById = async (req, res) => {
  const { id } = req.params;
  // TODO: Add auth check to ensure user is a member of this group.
  const { data, error } = await supabase.from('groups').select('*, members:group_members(*, user:profiles(*))').eq('id', id).single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Group not found' });
  res.json(data);
};

// Update a group
exports.updateGroup = async (req, res) => {
    // TODO: Add auth check to ensure user is a leader of this group.
    const { id } = req.params;
    const { name, description, privacy } = req.body;

    const { data, error } = await supabase
        .from('groups')
        .update({ name, description, privacy, updated_at: new Date() })
        .eq('id', id)
        .select()
        .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

// Delete a group
exports.deleteGroup = async (req, res) => {
    // TODO: Add auth check to ensure user is a leader of this group.
    const { id } = req.params;
    const { error } = await supabase.from('groups').delete().eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
};
