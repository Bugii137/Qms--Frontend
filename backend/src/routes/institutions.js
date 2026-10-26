const express = require('express');
const router = express.Router();

const institutionController = require('../controllers/institutionController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

// ── System admin (static paths first, before /:id) ──────────────────────────
router.get(
  '/admin/all',
  authenticate,
  authorize('admin'),
  institutionController.listForSystemAdmin
);
router.post(
  '/admin',
  authenticate,
  authorize('admin'),
  institutionController.createForSystemAdmin
);
router.put(
  '/admin/:id',
  authenticate,
  authorize('admin'),
  institutionController.updateForSystemAdmin
);
router.patch(
  '/admin/:id/status',
  authenticate,
  authorize('admin'),
  institutionController.setStatus
);
router.delete(
  '/admin/:id',
  authenticate,
  authorize('admin'),
  institutionController.deleteForSystemAdmin
);

// ── Institution admin self-service ──────────────────────────────────────────
router.get(
  '/me',
  authenticate,
  authorize('institution_admin'),
  institutionController.getMine
);
router.post(
  '/',
  authenticate,
  authorize('institution_admin'),
  institutionController.create
);
router.put(
  '/me',
  authenticate,
  authorize('institution_admin'),
  institutionController.updateMine
);

// ── Public directory (no auth) ───────────────────────────────────────────────
router.get('/', institutionController.listPublic);
router.get('/:id', institutionController.getPublicById);

module.exports = router;
