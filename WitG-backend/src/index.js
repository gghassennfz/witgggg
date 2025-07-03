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

// --- Chat API ---
const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

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

// Create HTTP server and bind Express app
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory user map for demo (replace with DB in production)
const onlineUsers = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining with userId
  socket.on('join', (userId) => {
    onlineUsers[userId] = socket.id;
    io.emit('presence', Object.keys(onlineUsers));
  });

  // Handle sending messages (direct or group)
  socket.on('send_message', async (data) => {
    // data: { to, from, message, groupId }
    try {
      // Save message to DB (Supabase)
      const { saveMessage } = require('./controllers/chatController');
      await saveMessage(data);
    } catch (err) {
      console.error('Failed to save message:', err);
    }
    if (data.groupId) {
      // Group message: emit to room
      io.to(data.groupId).emit('receive_message', data);
    } else if (data.to && onlineUsers[data.to]) {
      // Direct message
      io.to(onlineUsers[data.to]).emit('receive_message', data);
    }
  });

  // Handle sending notifications
  socket.on('send_notification', async (notif) => {
    // notif: { to, type, message, data }
    try {
      const { saveNotification } = require('./controllers/notificationController');
      await saveNotification(notif);
    } catch (err) {
      console.error('Failed to save notification:', err);
    }
    if (notif.to && onlineUsers[notif.to]) {
      io.to(onlineUsers[notif.to]).emit('receive_notification', notif);
    }
  });

  // Join group room
  socket.on('join_group', (groupId) => {
    socket.join(groupId);
  });

  // Typing indicator
  socket.on('typing', (data) => {
    // data: { to, from, groupId }
    if (data.groupId) {
      socket.to(data.groupId).emit('typing', data);
    } else if (data.to && onlineUsers[data.to]) {
      socket.to(onlineUsers[data.to]).emit('typing', data);
    }
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
    for (const [userId, id] of Object.entries(onlineUsers)) {
      if (id === socket.id) {
        delete onlineUsers[userId];
        break;
      }
    }
    io.emit('presence', Object.keys(onlineUsers));
  });
});

server.listen(PORT, () => {
  console.log(`WitG backend server is live and listening on port ${PORT}`);
});
