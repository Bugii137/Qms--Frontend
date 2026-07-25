const { query } = require('../db');

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
    return getSettings();
  }

  const { rows } = await query(
    `UPDATE platform_settings SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = 1 RETURNING *`,
    params
  );

  cache = null; // force the next isMaintenanceMode() check to re-read from the DB

  return toPublicSettings(rows[0]);
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
