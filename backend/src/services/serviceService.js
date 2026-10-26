const { query } = require('../db');
const { AppError } = require('../middleware/errorHandler');

function toPublicService(row) {
  return {
    id: row.id,
    institutionId: row.institution_id,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    price: row.price !== undefined && row.price !== null ? Number(row.price) : null,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/**
 * Confirms the given user owns the institution and returns its id.
 * Every write operation in this service goes through this first so an
 * institution_admin can never touch another institution's services.
 */
async function getOwnedInstitutionId(ownerId) {
  const { rows } = await query('SELECT id FROM institutions WHERE owner_id = $1', [ownerId]);
  if (!rows[0]) throw new AppError('You do not have an institution yet', 404);
  return rows[0].id;
}

/**
 * Public: active services for a given institution (Details / booking page).
 */
async function listPublicByInstitution(institutionId) {
  const { rows } = await query(
    `SELECT * FROM services WHERE institution_id = $1 AND is_active = TRUE ORDER BY name ASC`,
    [institutionId]
  );
  return rows.map(toPublicService);
}

async function getPublicById(serviceId) {
  const { rows } = await query(
    `SELECT * FROM services WHERE id = $1 AND is_active = TRUE`,
    [serviceId]
  );
  if (!rows[0]) throw new AppError('Service not found', 404);
  return toPublicService(rows[0]);
}

/**
 * Institution admin: all of their services, active or not
 * (the Settings page table shows both, with a toggle).
 */
async function listMine(ownerId) {
  const institutionId = await getOwnedInstitutionId(ownerId);
  const { rows } = await query(
    `SELECT * FROM services WHERE institution_id = $1 ORDER BY created_at DESC`,
    [institutionId]
  );
  return rows.map(toPublicService);
}

async function create(ownerId, { name, description, durationMinutes, price }) {
  const institutionId = await getOwnedInstitutionId(ownerId);

  const { rows } = await query(
    `INSERT INTO services (institution_id, name, description, duration_minutes, price)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [institutionId, name, description || null, durationMinutes || 30, price || 0]
  );

  return toPublicService(rows[0]);
}

/**
 * Shared ownership check used by update/setStatus/remove — confirms the
 * service belongs to an institution owned by ownerId.
 */
async function assertOwnedService(ownerId, serviceId) {
  const { rows } = await query(
    `SELECT s.* FROM services s
     JOIN institutions i ON i.id = s.institution_id
     WHERE s.id = $1 AND i.owner_id = $2`,
    [serviceId, ownerId]
  );
  if (!rows[0]) throw new AppError('Service not found', 404);
  return rows[0];
}

async function update(ownerId, serviceId, updates) {
  await assertOwnedService(ownerId, serviceId);

  const columnMap = {
    name: 'name',
    description: 'description',
    durationMinutes: 'duration_minutes',
    price: 'price',
  };

  const setClauses = [];
  const params = [serviceId];

  for (const [field, column] of Object.entries(columnMap)) {
    if (updates[field] !== undefined) {
      params.push(updates[field]);
      setClauses.push(`${column} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    throw new AppError('No valid fields provided to update', 400);
  }

  const { rows } = await query(
    `UPDATE services SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    params
  );

  return toPublicService(rows[0]);
}

async function setStatus(ownerId, serviceId, isActive) {
  await assertOwnedService(ownerId, serviceId);

  const { rows } = await query(
    `UPDATE services SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [isActive, serviceId]
  );

  return toPublicService(rows[0]);
}

async function remove(ownerId, serviceId) {
  await assertOwnedService(ownerId, serviceId);
  await query(
    'UPDATE services SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
    [serviceId]
  );
}

module.exports = {
  listPublicByInstitution,
  getPublicById,
  listMine,
  create,
  update,
  setStatus,
  remove,
};
