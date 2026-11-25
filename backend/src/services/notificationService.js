const { query } = require('../db');
const { sendEmail, verifyEmailTransport } = require('../config/email');
const { maintenanceEmail } = require('../utils/emailTemplates');
const { AppError } = require('../middleware/errorHandler');

const PREFERENCE_DEFAULTS = {
  emailConfirmed: true,
  emailApproved: true,
  emailRejected: true,
  emailRescheduled: true,
  emailCancelled: true,
  emailCompleted: true,
  appConfirmed: true,
  appApproved: true,
  appRejected: true,
  appRescheduled: true,
  appCancelled: true,
  appCompleted: true,
};

function normalizePreferences(value) {
  return { ...PREFERENCE_DEFAULTS, ...(value || {}) };
}

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

async function getPreferences(userId) {
  const { rows } = await query(
    'SELECT notification_preferences FROM users WHERE id = $1',
    [userId]
  );
  if (!rows[0]) throw new AppError('User not found', 404);
  return normalizePreferences(rows[0].notification_preferences);
}

async function updatePreferences(userId, updates) {
  const { rows } = await query(
    `UPDATE users
     SET notification_preferences = notification_preferences || $2::jsonb,
         updated_at = NOW()
     WHERE id = $1
     RETURNING notification_preferences`,
    [userId, JSON.stringify(updates)]
  );
  if (!rows[0]) throw new AppError('User not found', 404);
  return normalizePreferences(rows[0].notification_preferences);
}

async function notifyAppointment(userId, {
  emailPreference,
  appPreference,
  title,
  message,
  emailMessage,
}) {
  const { rows } = await query(
    `SELECT email, notification_preferences
     FROM users
     WHERE id = $1`,
    [userId]
  );
  if (!rows[0]) throw new AppError('User not found', 404);

  const preferences = normalizePreferences(rows[0].notification_preferences);
  const appSent = preferences[appPreference]
    ? Boolean(await create(userId, { type: 'appointment', title, message }))
    : false;
  const emailSent = preferences[emailPreference]
    ? Boolean(await sendEmail({ to: rows[0].email, ...emailMessage }))
    : false;

  return { appSent, emailSent };
}

async function notifyActiveUsersOfMaintenance(message) {
  const { rows: recipients } = await query(
    'SELECT id, email FROM users WHERE is_active = TRUE ORDER BY id'
  );
  const { rows: inserted } = await query(
    `INSERT INTO notifications (user_id, type, title, message)
     SELECT id, 'system', 'System maintenance', $1
     FROM users
     WHERE id = ANY($2::integer[])
     RETURNING id`,
    [message, recipients.map(({ id }) => id)]
  );

  const emailMessage = maintenanceEmail(message);
  let emailSent = 0;
  let emailFailed = 0;
  let emailError;

  if (recipients.length) {
    try {
      await verifyEmailTransport();
    } catch (err) {
      console.error('[email] Maintenance broadcast SMTP check failed:', err.message);
      return {
        inAppSent: inserted.length,
        emailSent,
        emailFailed: recipients.length,
        emailError: err.message,
      };
    }
  }

  for (let index = 0; index < recipients.length; index += 10) {
    const batch = recipients.slice(index, index + 10);
    const results = await Promise.allSettled(batch.map(({ email: recipient }) =>
      sendEmail({ to: recipient, ...emailMessage, required: true })
    ));
    emailSent += results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failed = results.filter(result => result.status === 'rejected');
    emailFailed += failed.length;
    emailError ||= failed[0]?.reason?.message;
  }

  return {
    inAppSent: inserted.length,
    emailSent,
    emailFailed,
    ...(emailError ? { emailError } : {}),
  };
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

module.exports = {
  PREFERENCE_DEFAULTS,
  create,
  getPreferences,
  updatePreferences,
  notifyAppointment,
  listForUser,
  markRead,
  markAllRead,
  remove,
  notifyActiveUsersOfMaintenance,
};
