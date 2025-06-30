const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes in this file are protected by the auth middleware
router.use(authMiddleware);

// GET /api/profile - Fetch the current user's profile
router.get('/', profileController.getProfile);

// PUT /api/profile - Update the current user's profile
router.put('/', profileController.updateProfile);

// PUT /api/profile/password - Change the current user's password
router.put('/password', profileController.changePassword);

module.exports = router;
