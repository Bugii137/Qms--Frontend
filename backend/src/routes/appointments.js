const express = require('express');
const router = express.Router();

const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

// ── Institution admin (static paths before /:id) ─────────────────────────────
router.get(
  '/institution',
  authenticate,
  authorize('institution_admin'),
  appointmentController.listForInstitution
);
router.get(
  '/institution/queue',
  authenticate,
  authorize('institution_admin'),
  appointmentController.getQueue
);
router.post(
  '/institution/queue/:id/call-next',
  authenticate,
  authorize('institution_admin'),
  appointmentController.callNext
);
router.patch(
  '/:id/assign-staff',
  authenticate,
  authorize('institution_admin'),
  appointmentController.assignStaff
);

// ── Staff ────────────────────────────────────────────────────────────────────
router.get('/staff', authenticate, authorize('staff'), appointmentController.listForStaff);

// ── Client ───────────────────────────────────────────────────────────────────
router.post('/', authenticate, authorize('client'), appointmentController.book);
router.get('/mine', authenticate, authorize('client'), appointmentController.listMine);
router.get('/:id/queue-position', authenticate, authorize('client'), appointmentController.getQueuePosition);
router.patch('/:id/cancel', authenticate, authorize('client'), appointmentController.cancelMine);

// ── Shared: institution_admin or staff (access level checked in service) ────
router.patch(
  '/:id/status',
  authenticate,
  authorize('institution_admin', 'staff'),
  appointmentController.setStatus
);

module.exports = router;
