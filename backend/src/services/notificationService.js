const { query } = require('../db');
const { AppError } = require('../middleware/errorHandler');

function toPublicNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

/**
 * Create a notification for a user. Called internally by other services
 * (appointmentService, staffService, etc.) — not exposed as its own
 * public "create notification for anyone" endpoint.
 */
async function create(userId, { type, title, message }) {
  const { rows } = await query(
    `INSERT INTO notifications (user_id, type, title, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, type || 'general', title, message]
  );
  return toPublicNotification(rows[0]);
}

async function listForUser(userId, { unreadOnly } = {}) {
  const conditions = ['user_id = $1'];
  const params = [userId];

  if (unreadOnly) {
    conditions.push('is_read = FALSE');
  }

  const { rows } = await query(
    `SELECT * FROM notifications WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    params
  );
  return rows.map(toPublicNotification);
}

async function markRead(userId, notificationId) {
  const { rows } = await query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *`,
    [notificationId, userId]
  );
  if (!rows[0]) throw new AppError('Notification not found', 404);
  return toPublicNotification(rows[0]);
}

async function markAllRead(userId) {
  await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`, [userId]);
}

async function remove(userId, notificationId) {
  const { rowCount } = await query(
    'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
    [notificationId, userId]
  );
  if (!rowCount) throw new AppError('Notification not found', 404);
}


module.exports = { create, listForUser, markRead, markAllRead };
