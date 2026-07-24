const express = require('express');
const router = express.Router();

const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

router.get('/summary', authenticate, authorize('admin'), analyticsController.getSummary);
router.get('/', authenticate, authorize('admin'), analyticsController.getAnalytics);

module.exports = router;
