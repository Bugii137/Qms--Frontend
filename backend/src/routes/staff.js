const express = require('express');
const router = express.Router();

const staffController = require('../controllers/staffController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

// ── Staff self-service (static path before /:id) ─────────────────────────────
router.get('/me', authenticate, authorize('staff'), staffController.getMine);

// ── Institution admin ─────────────────────────────────────────────────────────
router.get('/', authenticate, authorize('institution_admin'), staffController.listByOwner);
router.post('/', authenticate, authorize('institution_admin'), staffController.invite);
router.put('/:id', authenticate, authorize('institution_admin'), staffController.update);
router.patch('/:id/status', authenticate, authorize('institution_admin'), staffController.setStatus);
router.delete('/:id', authenticate, authorize('institution_admin'), staffController.remove);

module.exports = router;
