const { query } = require('../db');

/**
 * Restricts a route to specific roles. Must run after `authenticate`,
 * since it reads req.user.role.
 *
 * Usage: router.get('/admin-only', authenticate, authorize('admin'), handler)
 */
function authorize(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }

    if (req.user.role === 'institution_admin') {
      try {
        const { rows } = await query(
          'SELECT status FROM institutions WHERE owner_id = $1',
          [req.user.id]
        );
        if (rows[0]?.status !== 'active') {
          return res.status(403).json({ error: 'Your institution must be approved before you can access this service' });
        }
      } catch (err) {
        return next(err);
      }
    }

    return next();
  };
}

module.exports = { authorize };
