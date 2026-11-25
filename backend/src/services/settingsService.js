const { query, getClient } = require('../db');
const notificationService = require('./notificationService');
const { AppError } = require('../middleware/errorHandler');

function toPublicSettings(row) {
  return {
    platformName: row.platform_name,
    supportEmail: row.support_email,
    maintenanceMode: row.maintenance_mode,
    maintenanceMessage: row.maintenance_message,
    updatedAt: row.updated_at,
  };
}

async function getSettings() {
  const { rows } = await query('SELECT * FROM platform_settings WHERE id = 1');
  return toPublicSettings(rows[0]);
}

async function updateSettings({ platformName, supportEmail, maintenanceMode, maintenanceMessage }) {
  const client = await getClient();
  let settings;
  let maintenanceEnabled = false;
  try {
    await client.query('BEGIN');
    const { rows: existingRows } = await client.query(
      'SELECT maintenance_mode FROM platform_settings WHERE id = 1 FOR UPDATE'
    );
    if (!existingRows[0]) throw new AppError('Platform settings are not initialized', 500);

    const setClauses = [];
    const params = [];
    const fields = {
      platform_name: platformName,
      support_email: supportEmail,
      maintenance_mode: maintenanceMode,
      maintenance_message: maintenanceMessage,
    };

    for (const [column, value] of Object.entries(fields)) {
      if (value !== undefined) {
        params.push(value);
        setClauses.push(`${column} = $${params.length}`);
      }
    }

    if (setClauses.length === 0) {
      await client.query('ROLLBACK');
      return { settings: await getSettings(), maintenanceNotice: null };
    }

    params.push(1);
    const { rows } = await client.query(
      `UPDATE platform_settings SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    settings = toPublicSettings(rows[0]);
    maintenanceEnabled = maintenanceMode === true && existingRows[0].maintenance_mode === false;
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  cache = null; // force the next isMaintenanceMode() check to re-read from the DB

  let maintenanceNotice = null;
  if (maintenanceEnabled) {
    try {
      maintenanceNotice = await notificationService.notifyActiveUsersOfMaintenance(settings.maintenanceMessage);
    } catch (err) {
      console.error('[notifications] Maintenance broadcast failed:', err.message);
      maintenanceNotice = { inAppSent: 0, emailSent: 0, emailFailed: 0, error: err.message };
    }
  }

  return { settings, maintenanceNotice };
}

/**
 * Lightweight cached read for the maintenance-mode gate in server.js —
 * every request shouldn't hit the DB just to check one flag. Cache is
 * invalidated immediately whenever updateSettings() is called.
 */
let cache = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5000;

async function isMaintenanceMode() {
  if (cache !== null && Date.now() < cacheExpiresAt) {
    return cache;
  }
  const settings = await getSettings();
  cache = settings.maintenanceMode;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cache;
}

module.exports = { getSettings, updateSettings, isMaintenanceMode };
