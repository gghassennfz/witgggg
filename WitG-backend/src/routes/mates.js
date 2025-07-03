const express = require('express');
const router = express.Router();
const mateController = require('../controllers/mateController');
const requireAuth = require('../middleware/authMiddleware');

router.post('/request', requireAuth, mateController.sendMateRequest);

// Debug: Health check endpoint
router.get('/test', (req, res) => res.json({ ok: true }));
router.get('/', requireAuth, mateController.getMates);
router.get('/requests', requireAuth, mateController.getMateRequests);
router.post('/requests/:requestId/respond', requireAuth, mateController.respondToMateRequest);
router.get('/notifications', requireAuth, mateController.getNotifications);

module.exports = router;
