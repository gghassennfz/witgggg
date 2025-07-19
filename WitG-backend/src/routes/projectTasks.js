const express = require('express');
const supabase = require('../supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.use(authMiddleware);

// GET /api/project-tasks/:projectId - Get all tasks for a project
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.query; // Optional filter by user
    
    let query = supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true });
    
    if (userId) {
      query = query.eq('assigned_to', userId);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching project tasks:', error);
      throw error;
    }
    res.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/project-tasks/:projectId:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/project-tasks - Create new task
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('POST /api/project-tasks - Request body:', req.body);
    console.log('POST /api/project-tasks - User:', req.user);
    
    const { project_id, title, description, assigned_to, due_date } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!project_id || !title) {
      return res.status(400).json({ error: 'project_id and title are required' });
    }
    
    const taskData = {
      project_id,
      created_by: userId,
      assigned_to: assigned_to || userId, // Default assign to creator
      title,
      description: description || null,
      status: 'todo', // Always start as todo
      priority: 'medium', // Default priority
      due_date: due_date || null,
      position: 0
    };
    
    console.log('Inserting task data:', taskData);
    
    const { data, error } = await supabase
      .from('project_tasks')
      .insert(taskData)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error creating task:', error);
      throw error;
    }
    
    console.log('Task created successfully:', data);
    
    // Log activity
    await supabase
      .from('project_activity_logs')
      .insert({
        project_id,
        user_id: userId,
        action_type: 'task_created',
        action_description: `Created task: "${title}"`,
        entity_type: 'task',
        entity_id: data.id
      });
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error in POST /api/project-tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/project-tasks/:taskId - Update task
router.put('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('project_tasks')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('project_activity_logs')
      .insert({
        project_id: data.project_id,
        user_id: userId,
        action_type: 'task_updated',
        action_description: `Updated task: "${data.title}"`,
        entity_type: 'task',
        entity_id: taskId,
        metadata: updates
      });
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/project-tasks/:taskId - Delete task
router.delete('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    
    // Get task info before deletion
    const { data: task } = await supabase
      .from('project_tasks')
      .select('project_id, title')
      .eq('id', taskId)
      .single();
    
    const { error } = await supabase
      .from('project_tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) throw error;
    
    // Log activity
    if (task) {
      await supabase
        .from('project_activity_logs')
        .insert({
          project_id: task.project_id,
          user_id: userId,
          action_type: 'task_deleted',
          action_description: `Deleted task: "${task.title}"`,
          entity_type: 'task',
          entity_id: taskId
        });
    }
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/project-tasks/:taskId/status - Update task status
router.patch('/:taskId/status', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    console.log(`Updating task ${taskId} status to ${status}`);
    
    // Validate status
    const validStatuses = ['todo', 'in_progress', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const { data, error } = await supabase
      .from('project_tasks')
      .update({ status, updated_at: new Date() })
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
    
    // Log activity
    await supabase
      .from('project_activity_logs')
      .insert({
        project_id: data.project_id,
        user_id: userId,
        action_type: 'task_status_changed',
        action_description: `Changed task "${data.title}" status to ${status}`,
        entity_type: 'task',
        entity_id: data.id
      });
    
    console.log('Task status updated successfully:', data);
    res.json(data);
  } catch (error) {
    console.error('Error in PATCH /api/project-tasks/:taskId/status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
