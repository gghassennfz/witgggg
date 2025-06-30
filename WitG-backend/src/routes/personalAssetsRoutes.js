const express = require('express');
const router = express.Router();
const { getPersonalAssets, createPersonalAsset, deletePersonalAsset } = require('../controllers/personalAssetsController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes in this file are protected and require authentication
router.use(authMiddleware);

// GET /api/personal-assets - Fetch all assets for the logged-in user
router.get('/', getPersonalAssets);

// POST /api/personal-assets - Create a new asset for the logged-in user
router.post('/', createPersonalAsset);

// DELETE /api/personal-assets/:id - Delete a specific asset for the logged-in user
router.delete('/:id', deletePersonalAsset);

module.exports = router;
