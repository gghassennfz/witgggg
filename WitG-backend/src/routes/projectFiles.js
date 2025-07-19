const express = require('express');
const supabase = require('../supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const router = express.Router();

router.use(authMiddleware);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// GET /api/project-files/:projectId - Get all files for a project
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, tags } = req.query;
    
    let query = supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId);
    
    if (userId) {
      query = query.eq('uploaded_by', userId);
    }
    
    if (tags) {
      const tagArray = tags.split(',');
      query = query.overlaps('tags', tagArray);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching project files:', error);
      throw error;
    }
    res.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/project-files/:projectId:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/project-files/upload - Upload file to project
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { project_id, description, tags, is_public = true } = req.body;
    const userId = req.user.id;
    const file = req.file;
    
    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`;
    const filePath = `projects/${project_id}/${fileName}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(filePath);
    
    // Save file metadata to database
    const { data, error } = await supabase
      .from('project_files')
      .insert({
        project_id,
        uploaded_by: userId,
        filename: fileName,
        original_filename: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        file_url: publicUrl,
        description,
        tags: tags ? tags.split(',') : [],
        is_public
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
        action_type: 'file_uploaded',
        action_description: `Uploaded file: "${file.originalname}"`,
        entity_type: 'file',
        entity_id: data.id,
        metadata: {
          file_size: file.size,
          mime_type: file.mimetype
        }
      });
    
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/project-files/:fileId - Update file metadata
router.put('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { description, tags, is_public } = req.body;
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('project_files')
      .update({
        description,
        tags: tags ? tags.split(',') : [],
        is_public,
        updated_at: new Date()
      })
      .eq('id', fileId)
      .eq('user_id', userId) // Only file owner can update
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('project_activity_logs')
      .insert({
        project_id: data.project_id,
        user_id: userId,
        action_type: 'file_updated',
        action_description: `Updated file: "${data.original_filename}"`,
        entity_type: 'file',
        entity_id: fileId
      });
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/project-files/:fileId - Delete file
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;
    
    // Get file info before deletion
    const { data: file } = await supabase
      .from('project_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId) // Only file owner can delete
      .single();
    
    if (!file) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }
    
    // Delete from storage
    const filePath = file.file_url.split('/').pop();
    await supabase.storage
      .from('project-files')
      .remove([`projects/${file.project_id}/${filePath}`]);
    
    // Delete from database
    const { error } = await supabase
      .from('project_files')
      .delete()
      .eq('id', fileId);
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('project_activity_logs')
      .insert({
        project_id: file.project_id,
        user_id: userId,
        action_type: 'file_deleted',
        action_description: `Deleted file: "${file.original_filename}"`,
        entity_type: 'file',
        entity_id: fileId
      });
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
