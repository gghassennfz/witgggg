const express = require('express');
const supabase = require('../supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/projects/group/:groupId - Get all projects in a group
router.get('/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        created_by_user:users!projects_created_by_fkey(id, name, email),
        project_members(user_id, role)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects - Create new project
router.post('/', async (req, res) => {
  try {
    const { group_id, name, description, due_date, priority, color, github_repo, design_files, resources } = req.body;
    const userId = req.user.id;
    
    console.log('Creating project:', { group_id, name, userId });
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        group_id,
        name,
        description,
        due_date,
        priority,
        color,
        github_repo,
        design_files,
        resources,
        created_by: userId
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating project:', error);
      throw error;
    }
    
    console.log('Project created:', data.id);
    
    // Add creator as project owner
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: data.id,
        user_id: userId,
        role: 'owner'
      });
    
    if (memberError) {
      console.error('Error adding project member:', memberError);
      // Don't fail the request if member addition fails
    }
    
    // Log activity
    await supabase
      .from('project_activity_logs')
      .insert({
        project_id: data.id,
        user_id: userId,
        action: 'project_created',
        details: { project_name: name }
      });
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error in POST /api/projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId - Get project details
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // First get the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw projectError;
    }
    
    // Get project members
    const { data: members, error: membersError } = await supabase
      .from('project_members')
      .select('user_id, role')
      .eq('project_id', projectId);
    
    if (membersError) {
      console.error('Error fetching members:', membersError);
    }
    
    // Add members to project data
    const projectWithMembers = {
      ...project,
      members: members || []
    };
    
    res.json(projectWithMembers);
  } catch (error) {
    console.error('Error in GET /api/projects/:projectId:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
