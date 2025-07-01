const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

// TODO: Add auth middleware to all routes to protect them

router.get('/', groupController.getAllGroups);
router.post('/', groupController.createGroup);
router.put('/:id', groupController.updateGroup);
router.delete('/:id', groupController.deleteGroup);

// --- New endpoints ---
// Get group details (with members and projects)
router.get('/:id', groupController.getGroupDetails);
// Members management
router.post('/:id/members', groupController.addMember);
router.delete('/:id/members/:userId', groupController.removeMember);
// Projects management
router.get('/:id/projects', groupController.getProjects);
router.post('/:id/projects', groupController.createProject);
router.delete('/:id/projects/:projectId', groupController.deleteProject);

module.exports = router;
