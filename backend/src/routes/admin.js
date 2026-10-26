const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

router.get('/users', authenticate, authorize('admin'), adminController.listUsers);
router.post('/users', authenticate, authorize('admin'), adminController.createUser);
router.put('/users/:id', authenticate, authorize('admin'), adminController.updateUser);
router.patch('/users/:id/status', authenticate, authorize('admin'), adminController.setUserActive);
router.delete('/users/:id', authenticate, authorize('admin'), adminController.deleteUser);

router.get('/settings', authenticate, authorize('admin'), settingsController.getSettings);
router.put('/settings', authenticate, authorize('admin'), settingsController.updateSettings);

module.exports = router;
