const express = require('express');
const router = express.Router();
const { sendMateRequest, updateMateRequest, getMates, getMyProfile } = require('../controllers/matesController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes in this file are protected by the authentication middleware
router.use(authMiddleware);

// Get the current user's profile and unique user_code
router.get('/profile', getMyProfile);

// Get all of the current user's mates (friends, pending requests, etc.)
router.get('/', getMates);

// Send a new mate request to another user via their user_code
router.post('/request', sendMateRequest);

// Respond to a mate request (accept/decline)
router.put('/request/:requestId', updateMateRequest);

module.exports = router;
