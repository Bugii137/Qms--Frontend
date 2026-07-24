const bcrypt = require('bcryptjs');
const { query, getClient } = require('../db');
const { sendEmail } = require('../config/email');
const { staffCredentialsEmail } = require('../utils/emailTemplates');
const { AppError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 10;

function toPublicStaff(row) {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    jobTitle: row.job_title,
    accessLevel: row.access_level,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function getOwnedInstitution(ownerId) {
  const { rows } = await query(
    'SELECT id, name FROM institutions WHERE owner_id = $1',
    [ownerId]
  );
  if (!rows[0]) throw new AppError('You do not have an institution yet', 404);
  return rows[0];
}

/**
 * All staff for the calling institution_admin's institution.
 */
async function listByOwner(ownerId) {
  const institution = await getOwnedInstitution(ownerId);

  const { rows } = await query(
    `SELECT ist.*, u.full_name, u.email, u.phone
     FROM institution_staff ist
     JOIN users u ON u.id = ist.user_id
     WHERE ist.institution_id = $1
     ORDER BY ist.created_at DESC`,
    [institution.id]
  );

  return rows.map(toPublicStaff);
}

/**
 * Invite a staff member by email.
 * - If a user with that email already exists, they're linked as-is
 *   (their existing password stays; they just get added to this institution).
 * - If not, a new user account is created with role 'staff' and a random
/**
 * Create a staff account with a password the institution_admin sets
 * directly — no email dependency for the account to become usable.
 * The staff member can log in immediately with the email/password the
 * admin gave them. A credentials email is still attempted as a
 * best-effort courtesy notification, but its failure never blocks
 * account creation or login.
 */
async function create(ownerId, { fullName, email, phone, jobTitle, accessLevel, password }) {
  const institution = await getOwnedInstitution(ownerId);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    let { rows: userRows } = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = userRows[0];

    if (user) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const inserted = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'staff')
       RETURNING *`,
      [fullName, email, phone || null, passwordHash]
    );
    user = inserted.rows[0];

    const { rows } = await client.query(
      `INSERT INTO institution_staff (institution_id, user_id, job_title, access_level, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [institution.id, user.id, jobTitle || 'Receptionist', accessLevel || 'view_only']
    );

    await client.query('COMMIT');

    // Best-effort only — the account is already fully usable with the
    // password the admin set, regardless of whether this email sends.
    const { subject, html } = staffCredentialsEmail(user.full_name, institution.name, user.email);
    sendEmail({ to: user.email, subject, html });

    return toPublicStaff({ ...rows[0], full_name: user.full_name, email: user.email, phone: user.phone });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Confirms the staff row belongs to an institution owned by ownerId.
 */
async function assertOwnedStaff(ownerId, staffId) {
  const { rows } = await query(
    `SELECT ist.* FROM institution_staff ist
     JOIN institutions i ON i.id = ist.institution_id
     WHERE ist.id = $1 AND i.owner_id = $2`,
    [staffId, ownerId]
  );
  if (!rows[0]) throw new AppError('Staff member not found', 404);
  return rows[0];
}

async function update(ownerId, staffId, { jobTitle, accessLevel }) {
  await assertOwnedStaff(ownerId, staffId);

  const setClauses = [];
  const params = [staffId];

  if (jobTitle !== undefined) {
    params.push(jobTitle);
    setClauses.push(`job_title = $${params.length}`);
  }
  if (accessLevel !== undefined) {
    params.push(accessLevel);
    setClauses.push(`access_level = $${params.length}`);
  }
  if (setClauses.length === 0) {
    throw new AppError('No valid fields provided to update', 400);
  }

  const { rows } = await query(
    `UPDATE institution_staff SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    params
  );

  return toPublicStaff(rows[0]);
}

async function setStatus(ownerId, staffId, status) {
  const validStatuses = ['invited', 'active', 'inactive'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid status value', 400);
  }
  await assertOwnedStaff(ownerId, staffId);

  const { rows } = await query(
    `UPDATE institution_staff SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, staffId]
  );

  return toPublicStaff(rows[0]);
}

/**
 * Removes the staff link (not the underlying user account — they may
 * belong to other institutions, or just log in as a plain client later).
 */
async function remove(ownerId, staffId) {
  await assertOwnedStaff(ownerId, staffId);
  await query('DELETE FROM institution_staff WHERE id = $1', [staffId]);
}

/**
 * For a logged-in staff user: their own assignment (institution, access level).
 * Used to gate what a 'staff' role user can see/do once authenticated.
 */
async function getMine(userId) {
  const { rows } = await query(
    `SELECT ist.*, i.name AS institution_name, i.id AS institution_id
     FROM institution_staff ist
     JOIN institutions i ON i.id = ist.institution_id
     WHERE ist.user_id = $1 AND ist.status = 'active'`,
    [userId]
  );
  if (!rows[0]) throw new AppError('No active staff assignment found', 404);
  return {
    institutionId: rows[0].institution_id,
    institutionName: rows[0].institution_name,
    jobTitle: rows[0].job_title,
    accessLevel: rows[0].access_level,
  };
}

/**
 * Called after a staff member successfully sets their password via the
 * invite link, to flip their status from 'invited' to 'active'.
 */
async function activateByUserId(userId) {
  await query(
    `UPDATE institution_staff SET status = 'active', updated_at = NOW()
     WHERE user_id = $1 AND status = 'invited'`,
    [userId]
  );
}

module.exports = { listByOwner, create, update, setStatus, remove, getMine, activateByUserId };
