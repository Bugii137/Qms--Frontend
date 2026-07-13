const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../db');
const { signToken } = require('../config/jwt');
const { sendEmail } = require('../config/email');
const { welcomeEmail, passwordResetEmail } = require('../utils/emailTemplates');
const { AppError } = require('../middleware/errorHandler');
const staffService = require('./staffService');

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function toPublicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
  };
}

async function register({ fullName, email, phone, password, role }) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const { rows } = await query(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, full_name, email, phone, role`,
    [fullName, email, phone || null, passwordHash, role || 'client']
  );

  const user = rows[0];
  const token = signToken({ id: user.id, role: user.role });

  const { subject, html } = welcomeEmail(user.full_name);
  sendEmail({ to: user.email, subject, html }); // fire-and-forget

  return { user: toPublicUser(user), token };
}

async function login({ email, password }) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  // Same error for "no such user" and "wrong password" — don't leak which one.
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.is_active) {
    throw new AppError('This account has been deactivated', 403);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken({ id: user.id, role: user.role });
  return { user: toPublicUser(user), token };
}

async function requestPasswordReset({ email, resetUrlBase }) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  // Always behave the same whether or not the email exists, to avoid
  // leaking which emails are registered.
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  const resetUrl = `${resetUrlBase}?token=${rawToken}`;
  const { subject, html } = passwordResetEmail(user.full_name, resetUrl);
  await sendEmail({ to: user.email, subject, html });
}

async function resetPassword({ token, newPassword }) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { rows } = await query(
    `SELECT * FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );
  const resetRecord = rows[0];

  if (!resetRecord) {
    throw new AppError('This reset link is invalid or has expired', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    passwordHash,
    resetRecord.user_id,
  ]);
  await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [resetRecord.id]);

  // If this was a staff invite link, activate the staff assignment now
  // that they've successfully set a password.
  await staffService.activateByUserId(resetRecord.user_id);
}

async function getById(userId) {
  const { rows } = await query(
    'SELECT id, full_name, email, phone, role FROM users WHERE id = $1',
    [userId]
  );
  if (!rows[0]) throw new AppError('User not found', 404);
  return toPublicUser(rows[0]);
}

/**
 * Update the logged-in user's own name/phone. Email and role are
 * intentionally not editable here — changing email would need its own
 * re-verification flow, and role changes shouldn't be self-service.
 */
async function updateProfile(userId, { fullName, phone }) {
  const setClauses = [];
  const params = [userId];

  if (fullName !== undefined) {
    params.push(fullName);
    setClauses.push(`full_name = $${params.length}`);
  }
  if (phone !== undefined) {
    params.push(phone);
    setClauses.push(`phone = $${params.length}`);
  }
  if (setClauses.length === 0) {
    throw new AppError('No valid fields provided to update', 400);
  }

  const { rows } = await query(
    `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $1
     RETURNING id, full_name, email, phone, role`,
    params
  );

  return toPublicUser(rows[0]);
}

/**
 * Change password for a logged-in user who knows their current password
 * (distinct from the forgot-password flow, which doesn't require it).
 */
async function changePassword(userId, { currentPassword, newPassword }) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user) throw new AppError('User not found', 404);

  const matches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!matches) {
    throw new AppError('Current password is incorrect', 401);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    passwordHash,
    userId,
  ]);
}

module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  getById,
  updateProfile,
  changePassword,
};
