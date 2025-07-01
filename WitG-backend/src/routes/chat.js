// Chat routes for fetching chat history
const express = require('express');
const router = express.Router();
const { fetchMessages } = require('../controllers/chatController');

// GET /api/chat/history?userA=...&userB=... OR ?groupId=...
router.get('/history', async (req, res) => {
  try {
    const { userA, userB, groupId, limit } = req.query;
    const messages = await fetchMessages({ userA, userB, groupId, limit: limit ? parseInt(limit) : 50 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
