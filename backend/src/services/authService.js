const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query, getClient } = require('../db');
const { signToken } = require('../config/jwt');
const { sendEmail } = require('../config/email');
const {
  welcomeEmail,
  institutionApplicationEmail,
  passwordResetEmail,
  profileUpdatedEmail,
  passwordChangedEmail,
} = require('../utils/emailTemplates');
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

async function register({ fullName, email, phone, password, role, institutionName, category }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const client = await getClient();
  let user;
  let institution;

  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new AppError('An account with this email already exists', 409);
    }

    const { rows } = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, phone, role`,
      [fullName, email, phone || null, passwordHash, role || 'client']
    );
    user = rows[0];

    if (user.role === 'institution_admin') {
      const result = await client.query(
        `INSERT INTO institutions (owner_id, name, category, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING id, name, category, status, created_at`,
        [user.id, institutionName, category || null]
      );
      institution = result.rows[0];

      await client.query(
        `INSERT INTO notifications (user_id, type, title, message)
         SELECT id, 'institution', 'Institution application submitted',
                $2
         FROM users
         WHERE id = $1 OR (role = 'admin' AND is_active = TRUE)`,
        [user.id, `The application for ${institution.name} has been submitted and is awaiting review.`]
      );
    } else {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'general', 'Welcome to JIPANGE', 'Your account is ready. You can now browse institutions and book appointments.')`,
        [user.id]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  if (institution) {
    const emailMessage = institutionApplicationEmail(user.full_name, institution.name);
    const emailInfo = await sendEmail({ to: user.email, ...emailMessage });
    return {
      user: toPublicUser(user),
      institution: {
        id: institution.id,
        name: institution.name,
        category: institution.category,
        status: institution.status,
        createdAt: institution.created_at,
      },
      message: 'Your institution application has been submitted for approval.',
      emailSent: Boolean(emailInfo),
    };
  }

  const token = signToken({ id: user.id, role: user.role });
  const emailMessage = welcomeEmail(user.full_name, `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`);
  const emailInfo = await sendEmail({ to: user.email, ...emailMessage });

  return { user: toPublicUser(user), token, emailSent: Boolean(emailInfo) };
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

  if (user.role === 'institution_admin') {
    const { rows: institutions } = await query(
      'SELECT status FROM institutions WHERE owner_id = $1',
      [user.id]
    );
    const status = institutions[0]?.status;
    if (status === 'pending') {
      throw new AppError('Your institution application is awaiting super admin approval', 403);
    }
    if (status !== 'active') {
      throw new AppError('Your institution account is not approved for access', 403);
    }
  }

  const token = signToken({ id: user.id, role: user.role });
  return { user: toPublicUser(user), token };
}

async function resendWelcomeEmail(userId) {
  const { rows } = await query(
    'SELECT full_name, email FROM users WHERE id = $1 AND role = $2',
    [userId, 'client']
  );
  const user = rows[0];
  if (!user) throw new AppError('Client account not found', 404);

  const email = welcomeEmail(
    user.full_name,
    `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`
  );
  const emailInfo = await sendEmail({ to: user.email, ...email });
  return Boolean(emailInfo);
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
  const emailMessage = passwordResetEmail(user.full_name, resetUrl);
  const emailInfo = await sendEmail({ to: user.email, ...emailMessage });
  return Boolean(emailInfo);
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

  const { rows: userRows } = await query(
    'SELECT full_name, email FROM users WHERE id = $1',
    [resetRecord.user_id]
  );
  const email = passwordChangedEmail(userRows[0].full_name);
  const emailInfo = await sendEmail({ to: userRows[0].email, ...email });

  // If this was a staff invite link, activate the staff assignment now
  // that they've successfully set a password.
  await staffService.activateByUserId(resetRecord.user_id);
  return Boolean(emailInfo);
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
async function updateProfile(userId, { fullName, phone }, role) {
  const { rows: currentRows } = await query(
    'SELECT full_name, phone FROM users WHERE id = $1',
    [userId]
  );
  if (!currentRows[0]) throw new AppError('User not found', 404);

  // Staff may only edit their own profile details with Full Access. The staff
  // Profile page already disables the fields for other levels; enforce the
  // same rule here so it can't be bypassed by calling the API directly.
  if (role === 'staff') {
    const { rows: staffRows } = await query(
      `SELECT access_level FROM institution_staff WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );
    if (!staffRows[0] || staffRows[0].access_level !== 'full_access') {
      throw new AppError('Your access level does not allow editing profile details', 403);
    }
  }

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

  const updatedFields = [];
  if (fullName !== undefined && fullName !== currentRows[0].full_name) updatedFields.push('name');
  if (phone !== undefined && phone !== currentRows[0].phone) updatedFields.push('phone number');
  let emailSent = null;
  if (updatedFields.length) {
    const email = profileUpdatedEmail(rows[0].full_name, updatedFields);
    const emailInfo = await sendEmail({ to: rows[0].email, ...email });
    emailSent = Boolean(emailInfo);
  }

  return { user: toPublicUser(rows[0]), emailSent };
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
  const email = passwordChangedEmail(user.full_name);
  const emailInfo = await sendEmail({ to: user.email, ...email });
  return Boolean(emailInfo);
}

module.exports = {
  register,
  login,
  resendWelcomeEmail,
  requestPasswordReset,
  resetPassword,
  getById,
  updateProfile,
  changePassword,
};
