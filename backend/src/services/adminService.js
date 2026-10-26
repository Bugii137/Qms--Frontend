const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { AppError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 10;

function toPublicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    appointmentCount: row.appointment_count !== undefined ? Number(row.appointment_count) : undefined,
  };
}

/**
 * Every user on the platform, with a real appointment count (as client)
 * so the Users table isn't showing a fabricated number. Supports basic
 * search/role/status filtering — the same shape the frontend table needs.
 */
async function listUsers({ search, role, isActive } = {}) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (role) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`u.is_active = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT u.*, COUNT(a.id) AS appointment_count
     FROM users u
     LEFT JOIN appointments a ON a.client_id = u.id
     ${whereClause}
     GROUP BY u.id
     ORDER BY u.created_at DESC`,
    params
  );

  return rows.map(toPublicUser);
}

async function createUser({ fullName, email, phone, password }) {
  const { rows: existingRows } = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingRows[0]) throw new AppError('An account with this email already exists', 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await query(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, 'client')
     RETURNING *`,
    [fullName, email, phone || null, passwordHash]
  );
  return toPublicUser(rows[0]);
}

async function updateUser(userId, updates) {
  const { rows: existingRows } = await query('SELECT id FROM users WHERE id = $1', [userId]);
  if (!existingRows[0]) throw new AppError('User not found', 404);

  if (updates.email) {
    const { rows: duplicateRows } = await query(
      'SELECT id FROM users WHERE email = $1 AND id <> $2',
      [updates.email, userId]
    );
    if (duplicateRows[0]) throw new AppError('An account with this email already exists', 409);
  }

  const columns = { fullName: 'full_name', email: 'email', phone: 'phone' };
  const setClauses = [];
  const params = [userId];
  for (const [field, column] of Object.entries(columns)) {
    if (updates[field] !== undefined) {
      params.push(updates[field] || null);
      setClauses.push(`${column} = $${params.length}`);
    }
  }
  if (!setClauses.length) throw new AppError('No valid fields provided to update', 400);

  const { rows } = await query(
    `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    params
  );
  return toPublicUser(rows[0]);
}

/**
 * Activate/suspend any user on the platform. A system admin can never
 * suspend their own account through this endpoint (would lock them out
 * with no recovery path).
 */
async function setUserActive(callerId, userId, isActive) {
  if (Number(userId) === Number(callerId)) {
    throw new AppError('You cannot change your own account status', 400);
  }

  const { rows } = await query(
    `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [isActive, userId]
  );

  if (!rows[0]) throw new AppError('User not found', 404);
  return toPublicUser(rows[0]);
}

module.exports = { listUsers, createUser, updateUser, setUserActive };
