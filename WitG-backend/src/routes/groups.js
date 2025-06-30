const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

// TODO: Add auth middleware to all routes to protect them

router.get('/', groupController.getAllGroups);
router.post('/', groupController.createGroup);
router.get('/:id', groupController.getGroupById);
router.put('/:id', groupController.updateGroup);
router.delete('/:id', groupController.deleteGroup);

module.exports = router;
