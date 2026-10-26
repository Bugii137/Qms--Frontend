const { verifyToken } = require('../config/jwt');
const { query } = require('../db');

/**
 * Requires a valid `Authorization: Bearer <token>` header.
 * On success, attaches the decoded payload (id, role, ...) to req.user.
 * Any failure is forwarded to errorHandler via next(err).
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    req.user = verifyToken(token);
    const { rows } = await query('SELECT is_active FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0] || !rows[0].is_active) {
      return res.status(401).json({ error: 'This account is inactive' });
    }
    next();
  } catch (err) {
    next(err); // errorHandler translates JsonWebTokenError / TokenExpiredError
  }
}

module.exports = { authenticate };
