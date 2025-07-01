// User routes for fetching user list
const express = require('express');
const router = express.Router();
const { fetchUsers } = require('../controllers/userController');

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await fetchUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
