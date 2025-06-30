const supabase = require('../supabaseClient');

// A helper function to log activities
const logActivity = async (groupId, userId, activityType, details) => {
  const { error } = await supabase
    .from('activity_logs')
    .insert([{ group_id: groupId, user_id: userId, activity_type: activityType, details }]);

  if (error) {
    console.error('Error logging activity:', error);
  }
};

// Get all tasks for a specific group
exports.getTasksByGroup = async (req, res) => {
  const { groupId } = req.params;
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new task in a group
exports.createTask = async (req, res) => {
  const { groupId } = req.params;
  const { title, description, assigned_to, due_date } = req.body;
  const userId = req.user.id; // Assuming you have user info in the request

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ group_id: groupId, title, description, assigned_to, due_date, status: 'To Do' }])
      .select()
      .single();

    if (error) throw error;

    // Log this activity
    await logActivity(groupId, userId, 'task_created', `created a new task: "${title}"`);

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a task (e.g., change its status)
exports.updateTask = async (req, res) => {
  const { taskId } = req.params;
  const { title, description, status, assigned_to, due_date } = req.body;
  const userId = req.user.id;

  try {
    // First, get the task to find its group_id for logging
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('group_id, title')
      .eq('id', taskId)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('tasks')
      .update({ title, description, status, assigned_to, due_date })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    // Log this activity
    await logActivity(existingTask.group_id, userId, 'task_updated', `updated the task: "${existingTask.title}" to status "${status}"`);

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a task
exports.deleteTask = async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user.id;

  try {
    // Get the task for logging before deleting
    const { data: taskToDelete, error: fetchError } = await supabase
      .from('tasks')
      .select('group_id, title')
      .eq('id', taskId)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) throw error;

    // Log this activity
    await logActivity(taskToDelete.group_id, userId, 'task_deleted', `deleted the task: "${taskToDelete.title}"`);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
