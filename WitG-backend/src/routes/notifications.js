// Notification routes for fetching notifications
const express = require('express');
const router = express.Router();
const { fetchNotifications } = require('../controllers/notificationController');

// GET /api/notifications?to=...
router.get('/', async (req, res) => {
  try {
    const { to, limit } = req.query;
    const notifications = await fetchNotifications({ to, limit: limit ? parseInt(limit) : 20 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
