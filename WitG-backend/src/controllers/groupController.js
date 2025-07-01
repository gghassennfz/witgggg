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
    await supabase.from('groups').delete().eq('id', groupData.id);
    return res.status(500).json({ error: 'Failed to add user to group as leader.' });
  }

  res.status(201).json(groupData);
};

// Get group details with members and projects
exports.getGroupDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const { data: group, error } = await supabase
      .from('groups')
      .select(`*,
        members:group_members (
          id,
          role,
          user:profiles (id, username, email, avatar_url)
        ),
        projects:projects (
          id,
          name,
          description,
          created_at
        )
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add a member to a group
exports.addMember = async (req, res) => {
  const { id } = req.params;
  const { user_id, role } = req.body;
  try {
    const { data, error } = await supabase
      .from('group_members')
      .insert([{ group_id: id, user_id, role: role || 'member' }]);
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remove a member from a group
exports.removeMember = async (req, res) => {
  const { id, userId } = req.params;
  try {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', id)
      .eq('user_id', userId);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all projects for a group
exports.getProjects = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('group_id', id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a project in a group
exports.createProject = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{ group_id: id, name, description }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a project from a group
exports.deleteProject = async (req, res) => {
  const { projectId } = req.params;
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
