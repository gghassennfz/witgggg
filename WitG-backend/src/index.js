// WitG Backend API Server - Clean Rewrite
require('dotenv').config();
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

// --- Health Check Endpoint ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'WitG backend is running!' });
});

// --- Server Startup ---
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`WitG backend server is live and listening on port ${PORT}`);
});
