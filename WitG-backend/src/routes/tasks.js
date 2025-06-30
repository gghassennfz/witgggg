const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware'); // We'll create this next

// All these routes should be protected
router.use(authMiddleware);

// Routes for tasks within a group
router.get('/group/:groupId', taskController.getTasksByGroup);
router.post('/group/:groupId', taskController.createTask);

// Routes for a specific task
router.put('/:taskId', taskController.updateTask);
router.delete('/:taskId', taskController.deleteTask);

module.exports = router;
