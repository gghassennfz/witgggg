const express = require('express');
const supabase = require('../supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.use(authMiddleware);

// GET /api/project-logs/:projectId - Get activity logs for a project
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, limit = 50, offset = 0, actionType } = req.query;
    
    let query = supabase
      .from('project_activity_logs')
      .select('*')
      .eq('project_id', projectId);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (actionType) {
      query = query.eq('action', actionType);
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching project logs:', error);
      throw error;
    }
    res.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/project-logs/:projectId:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/project-logs/:projectId/stats - Get activity statistics
router.get('/:projectId/stats', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    let query = supabase
      .from('project_activity_logs')
      .select('action_type, created_at, user_id')
      .eq('project_id', projectId)
      .gte('created_at', startDate.toISOString());
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Process statistics
    const stats = {
      totalActivities: data.length,
      activitiesByType: {},
      activitiesByUser: {},
      activitiesByDay: {}
    };
    
    data.forEach(log => {
      // By type
      stats.activitiesByType[log.action_type] = (stats.activitiesByType[log.action_type] || 0) + 1;
      
      // By user
      stats.activitiesByUser[log.user_id] = (stats.activitiesByUser[log.user_id] || 0) + 1;
      
      // By day
      const day = new Date(log.created_at).toISOString().split('T')[0];
      stats.activitiesByDay[day] = (stats.activitiesByDay[day] || 0) + 1;
    });
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/project-logs - Create activity log (manual logging)
router.post('/', async (req, res) => {
  try {
    const { project_id, action_type, action_description, entity_type, entity_id, metadata } = req.body;
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('project_activity_logs')
      .insert({
        project_id,
        user_id: userId,
        action_type,
        action_description,
        entity_type,
        entity_id,
        metadata
      })
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/project-logs/:projectId/stats - Get project activity stats
router.get('/:projectId/stats', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, days = 30 } = req.query;
    
    console.log(`Fetching stats for project ${projectId}, user ${userId}, days ${days}`);
    
    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get activity stats
    const { data: stats, error } = await supabase
      .from('project_activity_logs')
      .select('action_type, created_at')
      .eq('project_id', projectId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching stats:', error);
      // Return empty stats instead of throwing error
      const emptyResult = {
        totalActivities: 0,
        actionCounts: {},
        dailyActivity: {},
        period: `${days} days`
      };
      return res.json(emptyResult);
    }
    
    // Process stats
    const actionCounts = {};
    const dailyActivity = {};
    
    stats.forEach(log => {
      // Count by action type
      actionCounts[log.action_type] = (actionCounts[log.action_type] || 0) + 1;
      
      // Count by day
      const day = new Date(log.created_at).toDateString();
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    });
    
    const result = {
      totalActivities: stats.length,
      actionCounts,
      dailyActivity,
      period: `${days} days`
    };
    
    console.log('Stats result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error in GET /api/project-logs/:projectId/stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
