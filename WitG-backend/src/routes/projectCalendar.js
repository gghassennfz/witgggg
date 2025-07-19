const express = require('express');
const supabase = require('../supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.use(authMiddleware);

// GET /api/project-calendar/:projectId - Get calendar events for a project
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, start, end } = req.query;
    
    let query = supabase
      .from('project_calendar_events')
      .select('*')
      .eq('project_id', projectId);
    
    if (userId) {
      query = query.eq('created_by', userId);
    }
    
    if (start && end) {
      query = query
        .gte('start_date', start)
        .lte('end_date', end);
    }
    
    const { data, error } = await query.order('start_date', { ascending: true });
    if (error) {
      console.error('Error fetching project calendar events:', error);
      throw error;
    }
    res.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/project-calendar/:projectId:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/project-calendar - Create calendar event
router.post('/', async (req, res) => {
  try {
    const { project_id, task_id, title, description, start_date, end_date, event_type, color, is_all_day } = req.body;
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('project_calendar_events')
      .insert({
        project_id,
        user_id: userId,
        task_id,
        title,
        description,
        start_date,
        end_date,
        event_type,
        color,
        is_all_day
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('project_activity_logs')
      .insert({
        project_id,
        user_id: userId,
        action_type: 'event_created',
        action_description: `Created calendar event: "${title}"`,
        entity_type: 'event',
        entity_id: data.id
      });
    
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/project-calendar/:eventId - Update calendar event
router.put('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const updates = req.body;
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('project_calendar_events')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', eventId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('project_activity_logs')
      .insert({
        project_id: data.project_id,
        user_id: userId,
        action_type: 'event_updated',
        action_description: `Updated calendar event: "${data.title}"`,
        entity_type: 'event',
        entity_id: eventId
      });
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/project-calendar/:eventId - Delete calendar event
router.delete('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    
    // Get event info before deletion
    const { data: event } = await supabase
      .from('project_calendar_events')
      .select('project_id, title')
      .eq('id', eventId)
      .single();
    
    const { error } = await supabase
      .from('project_calendar_events')
      .delete()
      .eq('id', eventId);
    
    if (error) throw error;
    
    // Log activity
    if (event) {
      await supabase
        .from('project_activity_logs')
        .insert({
          project_id: event.project_id,
          user_id: userId,
          action_type: 'event_deleted',
          action_description: `Deleted calendar event: "${event.title}"`,
          entity_type: 'event',
          entity_id: eventId
        });
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
