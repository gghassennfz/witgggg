const express = require('express');
const supabase = require('../supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow most file types for business communication
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar|mp4|mov|avi|xlsx|pptx|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// GET /api/enhanced-chat/chats - Get all chats for current user
router.get('/chats', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: chats, error } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants!inner(user_id, role, last_read_at, is_muted, is_pinned),
        messages(
          id,
          content,
          message_type,
          created_at,
          sender_id
        )
      `)
      .eq('chat_participants.user_id', userId)
      .order('last_message_at', { ascending: false });
    
    if (error) throw error;
    
    // Get unread count for each chat
    const chatsWithUnread = await Promise.all(chats.map(async (chat) => {
      const participant = chat.chat_participants[0];
      
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .gt('created_at', participant.last_read_at || '1970-01-01');
      
      return {
        ...chat,
        unread_count: unreadCount || 0,
        participant_info: participant
      };
    }));
    
    res.json(chatsWithUnread);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/enhanced-chat/chats - Create new chat
router.post('/chats', async (req, res) => {
  try {
    const { type, name, description, group_id, participant_ids } = req.body;
    const userId = req.user.id;
    
    // Create chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        type,
        name,
        description,
        group_id,
        created_by: userId
      })
      .select()
      .single();
    
    if (chatError) throw chatError;
    
    // Add participants
    const participants = [
      { chat_id: chat.id, user_id: userId, role: 'admin' },
      ...(participant_ids || []).map(id => ({ chat_id: chat.id, user_id: id, role: 'member' }))
    ];
    
    const { error: participantError } = await supabase
      .from('chat_participants')
      .insert(participants);
    
    if (participantError) throw participantError;
    
    res.status(201).json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/enhanced-chat/chats/:chatId/messages - Get messages for a chat
router.get('/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user.id;
    
    // Verify user has access to this chat
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('id')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();
    
    if (!participant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:auth.users!messages_sender_id_fkey(id, email, raw_user_meta_data),
        message_attachments(*),
        message_reactions(*, user:auth.users!message_reactions_user_id_fkey(id, email, raw_user_meta_data)),
        reply_to:messages!messages_reply_to_id_fkey(id, content, sender_id)
      `)
      .eq('chat_id', chatId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (before) {
      query = query.lt('created_at', before);
    }
    
    const { data: messages, error } = await query;
    
    if (error) throw error;
    
    res.json(messages.reverse()); // Return in chronological order
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/enhanced-chat/chats/:chatId/messages - Send message
router.post('/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, message_type = 'text', reply_to_id, metadata } = req.body;
    const userId = req.user.id;
    
    // Verify user has access to this chat
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('id')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();
    
    if (!participant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Create message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: userId,
        content,
        message_type,
        reply_to_id,
        metadata: metadata || {}
      })
      .select(`
        *,
        sender:auth.users!messages_sender_id_fkey(id, email, raw_user_meta_data)
      `)
      .single();
    
    if (messageError) throw messageError;
    
    // Update chat's last_message_at
    await supabase
      .from('chats')
      .update({ last_message_at: new Date() })
      .eq('id', chatId);
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/enhanced-chat/chats/:chatId/messages/:messageId/attachments - Upload file
router.post('/chats/:chatId/messages/:messageId/attachments', upload.single('file'), async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Verify user has access and owns the message
    const { data: message } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .eq('chat_id', chatId)
      .eq('sender_id', userId)
      .single();
    
    if (!message) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const file = req.file;
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`;
    const filePath = `chat-files/${chatId}/${fileName}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);
    
    // Save attachment metadata
    const { data: attachment, error: attachmentError } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        filename: fileName,
        original_filename: file.originalname,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: file.mimetype
      })
      .select()
      .single();
    
    if (attachmentError) throw attachmentError;
    
    res.status(201).json(attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/enhanced-chat/chats/:chatId/messages/:messageId/reactions - Add reaction
router.post('/chats/:chatId/messages/:messageId/reactions', async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;
    
    // Verify user has access to this chat
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('id')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();
    
    if (!participant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Add or update reaction
    const { data: reaction, error } = await supabase
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: userId,
        emoji
      })
      .select(`
        *,
        user:auth.users!message_reactions_user_id_fkey(id, email, raw_user_meta_data)
      `)
      .single();
    
    if (error) throw error;
    
    res.status(201).json(reaction);
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/enhanced-chat/chats/:chatId/messages/:messageId/reactions/:emoji - Remove reaction
router.delete('/chats/:chatId/messages/:messageId/reactions/:emoji', async (req, res) => {
  try {
    const { messageId, emoji } = req.params;
    const userId = req.user.id;
    
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    
    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/enhanced-chat/chats/:chatId/read - Mark messages as read
router.post('/chats/:chatId/read', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message_id } = req.body; // Optional: specific message to mark as read
    const userId = req.user.id;
    
    // Update participant's last_read_at
    const { error: participantError } = await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date() })
      .eq('chat_id', chatId)
      .eq('user_id', userId);
    
    if (participantError) throw participantError;
    
    // If specific message provided, add read receipt
    if (message_id) {
      const { error: receiptError } = await supabase
        .from('message_read_receipts')
        .upsert({
          message_id,
          user_id: userId
        });
      
      if (receiptError) throw receiptError;
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/enhanced-chat/chats/:chatId/search - Search messages
router.get('/chats/:chatId/search', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { q, sender_id, message_type, limit = 20 } = req.query;
    const userId = req.user.id;
    
    // Verify user has access to this chat
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('id')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();
    
    if (!participant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:auth.users!messages_sender_id_fkey(id, email, raw_user_meta_data)
      `)
      .eq('chat_id', chatId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (q) {
      query = query.ilike('content', `%${q}%`);
    }
    
    if (sender_id) {
      query = query.eq('sender_id', sender_id);
    }
    
    if (message_type) {
      query = query.eq('message_type', message_type);
    }
    
    const { data: messages, error } = await query;
    
    if (error) throw error;
    
    res.json(messages);
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/enhanced-chat/chats/:chatId/messages/:messageId - Edit message
router.put('/chats/:chatId/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    const { data: message, error } = await supabase
      .from('messages')
      .update({ 
        content, 
        is_edited: true,
        updated_at: new Date()
      })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .select(`
        *,
        sender:auth.users!messages_sender_id_fkey(id, email, raw_user_meta_data)
      `)
      .single();
    
    if (error) throw error;
    
    res.json(message);
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/enhanced-chat/chats/:chatId/messages/:messageId - Delete message
router.delete('/chats/:chatId/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    
    const { error } = await supabase
      .from('messages')
      .update({ 
        is_deleted: true,
        content: null,
        updated_at: new Date()
      })
      .eq('id', messageId)
      .eq('sender_id', userId);
    
    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
