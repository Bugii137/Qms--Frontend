const { query } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const notificationService = require('./notificationService');
const { sendEmail } = require('../config/email');
const { institutionStatusEmail } = require('../utils/emailTemplates');

function toPublicInstitution(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    address: row.address,
    phone: row.phone,
    email: row.email,
    logoUrl: row.logo_url,
    status: row.status,
    servicesCount: row.services_count !== undefined ? Number(row.services_count) : undefined,
    appointmentsCount: row.appointments_count !== undefined ? Number(row.appointments_count) : undefined,
    ownerName: row.owner_name,
    createdAt: row.created_at,
  };
}

/**
 * Public directory listing — only institutions the admin has approved,
 * optionally filtered by search term / category.
 */
async function listPublic({ search, category } = {}) {
  const conditions = [`i.status = 'active'`];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`i.name ILIKE $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`i.category = $${params.length}`);
  }

  const { rows } = await query(
    `SELECT i.*,
            COUNT(DISTINCT s.id) AS services_count
     FROM institutions i
     LEFT JOIN services s ON s.institution_id = i.id AND s.is_active = TRUE
     WHERE ${conditions.join(' AND ')}
     GROUP BY i.id
     ORDER BY i.name ASC`,
    params
  );

  return rows.map(toPublicInstitution);
}

async function getPublicById(institutionId) {
  const { rows } = await query(
    `SELECT i.*, COUNT(DISTINCT s.id) AS services_count
     FROM institutions i
     LEFT JOIN services s ON s.institution_id = i.id AND s.is_active = TRUE
     WHERE i.id = $1 AND i.status = 'active'
     GROUP BY i.id`,
    [institutionId]
  );
  if (!rows[0]) throw new AppError('Institution not found', 404);
  return toPublicInstitution(rows[0]);
}

/**
 * The institution owned by a given institution_admin user.
 * Used for the admin's own Overview/Settings pages (regardless of status,
 * since a pending institution's owner still needs to see/edit it).
 */
async function getByOwner(ownerId) {
  const { rows } = await query(`SELECT * FROM institutions WHERE owner_id = $1`, [ownerId]);
  if (!rows[0]) throw new AppError('You do not have an institution yet', 404);
  return toPublicInstitution(rows[0]);
}

async function create(ownerId, { name, category, description, address, phone, email, logoUrl }) {
  const existing = await query('SELECT id FROM institutions WHERE owner_id = $1', [ownerId]);
  if (existing.rows.length > 0) {
    throw new AppError('This account already has an institution', 409);
  }

  const { rows } = await query(
    `INSERT INTO institutions (owner_id, name, category, description, address, phone, email, logo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [ownerId, name, category || null, description || null, address || null, phone || null, email || null, logoUrl || null]
  );

  return toPublicInstitution(rows[0]);
}

/**
 * Update the institution's own profile. Scoped to ownerId so one
 * institution_admin can never edit another's institution.
 */
async function updateByOwner(ownerId, updates) {
  const allowedFields = ['name', 'category', 'description', 'address', 'phone', 'email', 'logoUrl'];
  const columnMap = {
    name: 'name',
    category: 'category',
    description: 'description',
    address: 'address',
    phone: 'phone',
    email: 'email',
    logoUrl: 'logo_url',
  };

  const setClauses = [];
  const params = [ownerId];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      params.push(updates[field]);
      setClauses.push(`${columnMap[field]} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    throw new AppError('No valid fields provided to update', 400);
  }

  const { rows } = await query(
    `UPDATE institutions SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE owner_id = $1
     RETURNING *`,
    params
  );

  if (!rows[0]) throw new AppError('You do not have an institution yet', 404);
  return toPublicInstitution(rows[0]);
}

/**
 * System admin view: every institution regardless of status, with
 * owner name and appointment counts for the admin table.
 */
async function listForSystemAdmin({ status } = {}) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`i.status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT i.*,
            u.full_name AS owner_name,
            COUNT(DISTINCT a.id) AS appointments_count
     FROM institutions i
     JOIN users u ON u.id = i.owner_id
     LEFT JOIN appointments a ON a.institution_id = i.id
     ${whereClause}
     GROUP BY i.id, u.full_name
     ORDER BY i.created_at DESC`,
    params
  );

  return rows.map((row) => ({ ...toPublicInstitution(row), ownerId: row.owner_id }));
}

async function createForSystemAdmin({ ownerId, name, category, description, address, phone, email, logoUrl }) {
  const { rows: ownerRows } = await query(
    `SELECT id FROM users WHERE id = $1 AND role = 'institution_admin' AND is_active = TRUE`,
    [ownerId]
  );
  if (!ownerRows[0]) throw new AppError('An active institution admin account is required', 400);

  const { rows: existingRows } = await query('SELECT id FROM institutions WHERE owner_id = $1', [ownerId]);
  if (existingRows[0]) throw new AppError('This account already owns an institution', 409);

  const { rows } = await query(
    `INSERT INTO institutions (owner_id, name, category, description, address, phone, email, logo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [ownerId, name, category || null, description || null, address || null, phone || null, email || null, logoUrl || null]
  );
  return toPublicInstitution(rows[0]);
}

async function updateForSystemAdmin(institutionId, updates) {
  const columns = {
    name: 'name',
    category: 'category',
    description: 'description',
    address: 'address',
    phone: 'phone',
    email: 'email',
    logoUrl: 'logo_url',
  };
  const setClauses = [];
  const params = [institutionId];
  for (const [field, column] of Object.entries(columns)) {
    if (updates[field] !== undefined) {
      params.push(updates[field] || null);
      setClauses.push(`${column} = $${params.length}`);
    }
  }
  if (!setClauses.length) throw new AppError('No valid fields provided to update', 400);

  const { rows } = await query(
    `UPDATE institutions SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    params
  );
  if (!rows[0]) throw new AppError('Institution not found', 404);
  return toPublicInstitution(rows[0]);
}

async function setStatus(institutionId, status) {
  const validStatuses = ['pending', 'active', 'suspended'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid status value', 400);
  }

  const { rows } = await query(
    `UPDATE institutions
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND status IS DISTINCT FROM $1
     RETURNING *`,
    [status, institutionId]
  );

  let institution = rows[0];
  if (!institution) {
    const { rows: existingRows } = await query('SELECT * FROM institutions WHERE id = $1', [institutionId]);
    if (!existingRows[0]) throw new AppError('Institution not found', 404);
    return { institution: toPublicInstitution(existingRows[0]), emailSent: null };
  }

  const approved = status === 'active';
  const { rows: ownerRows } = await query(
    'SELECT full_name, email FROM users WHERE id = $1',
    [institution.owner_id]
  );
  if (!ownerRows[0]) throw new AppError('Institution owner not found', 404);

  await notificationService.create(institution.owner_id, {
    type: 'institution',
    title: approved ? 'Institution application approved' : 'Institution status updated',
    message: approved
      ? `Your application for ${institution.name} has been approved. You can now sign in.`
      : `The status of ${institution.name} is now ${status}.`,
  });

  const email = institutionStatusEmail(ownerRows[0].full_name, institution.name, status);
  const emailInfo = await sendEmail({ to: ownerRows[0].email, ...email });

  return { institution: toPublicInstitution(institution), emailSent: Boolean(emailInfo) };
}

module.exports = {
  listPublic,
  getPublicById,
  getByOwner,
  create,
  updateByOwner,
  listForSystemAdmin,
  createForSystemAdmin,
  updateForSystemAdmin,
  setStatus,
};
