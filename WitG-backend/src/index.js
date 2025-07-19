// WitG Backend API Server - Clean Rewrite
require('dotenv').config();

// Log all uncaught errors for diagnostics
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
const express = require('express');
const cors = require('cors');

// --- Route Imports ---
const groupRoutes = require('./routes/groups');
const taskRoutes = require('./routes/tasks');
const mateRoutes = require('./routes/mates');
const profileRoutes = require('./routes/profile');
const personalAssetsRoutes = require('./routes/personalAssetsRoutes');
const projectRoutes = require('./routes/projects');
const projectTaskRoutes = require('./routes/projectTasks');
const projectCalendarRoutes = require('./routes/projectCalendar');
const projectLogsRoutes = require('./routes/projectLogs');
const projectFilesRoutes = require('./routes/projectFiles');

// --- App Initialization ---
const app = express();

// --- Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON bodies

// --- API Routes ---
app.use('/api/groups', groupRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/mates', mateRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/personal-assets', personalAssetsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/project-tasks', projectTaskRoutes);
app.use('/api/project-calendar', projectCalendarRoutes);
app.use('/api/project-logs', projectLogsRoutes);
app.use('/api/project-files', projectFilesRoutes);

// --- Chat API ---
const chatRoutes = require('./routes/chat');
const enhancedChatRoutes = require('./routes/enhancedChat');
app.use('/api/chat', chatRoutes);
app.use('/api/enhanced-chat', enhancedChatRoutes);

// --- User API ---
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// --- Notification API ---
const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

// --- Health Check Endpoint ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'WitG backend is running!' });
});

// --- Server Startup ---
const http = require('http');
const { Server } = require('socket.io');
const PORT = process.env.PORT || 4001;

// --- Socket.IO Setup ---
const socketIo = require('socket.io');
const ChatSocketHandler = require('./socketHandlers/chatSocketHandler');

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize enhanced chat socket handler
const chatSocketHandler = new ChatSocketHandler(io);

// --- Socket.IO Event Handlers ---
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Use enhanced chat handler for all chat-related events
  chatSocketHandler.handleConnection(socket);

  // Legacy handlers for backward compatibility
  socket.on('join', (userId) => {
    socket.userId = userId;
    socket.join(userId);
    console.log(`User ${userId} joined (legacy)`);
  });

  socket.on('joinGroup', (groupId) => {
    socket.join(groupId);
    console.log(`User ${socket.userId} joined group ${groupId} (legacy)`);
  });

  socket.on('leaveGroup', (groupId) => {
    socket.leave(groupId);
    console.log(`User ${socket.userId} left group ${groupId} (legacy)`);
  });

  socket.on('sendMessage', (data) => {
    const { groupId, message, sender } = data;
    io.to(groupId).emit('receiveMessage', {
      message,
      sender,
      timestamp: new Date()
    });
    console.log(`Message sent to group ${groupId} (legacy):`, message);
  });

  socket.on('typing', (data) => {
    const { groupId, isTyping, user } = data;
    socket.to(groupId).emit('userTyping', { isTyping, user });
  });

  socket.on('userOnline', (userId) => {
    socket.broadcast.emit('userStatusChanged', { userId, status: 'online' });
  });

  socket.on('userOffline', (userId) => {
    socket.broadcast.emit('userStatusChanged', { userId, status: 'offline' });
  });

  // Call signaling events
  socket.on('call_signal', (data) => {
    // data: { to, from, signal }
    if (data.to && onlineUsers[data.to]) {
      io.to(onlineUsers[data.to]).emit('call_signal', data);
    }
  });

  // Voicemail event (send voice message)
  socket.on('send_voicemail', (data) => {
    // data: { to, from, audioUrl, duration }
    if (data.to && onlineUsers[data.to]) {
      io.to(onlineUsers[data.to]).emit('receive_voicemail', data);
    }
    // Optionally persist voicemail info to DB here
  });

  // Board/task collaboration events
  socket.on('board_update', (data) => {
    // data: { boardId, changes, userId }
    socket.broadcast.emit('board_update', data);
    // Optionally persist changes to DB here
  });
  socket.on('task_update', (data) => {
    // data: { taskId, changes, userId }
    socket.broadcast.emit('task_update', data);
    // Optionally persist changes to DB here
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.userId) {
      socket.broadcast.emit('userStatusChanged', { 
        userId: socket.userId, 
        status: 'offline' 
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`WitG backend server is live and listening on port ${PORT}`);
});
