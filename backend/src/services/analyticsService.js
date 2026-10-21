const { query } = require('../db');

/**
 * Everything a system admin's Overview page needs in one round trip:
 * institution counts (total/pending/active), user counts by role,
 * appointments today, and the 5 most recent institution registrations.
 */
async function getPlatformSummary() {
  const [institutionCounts, userCounts, apptsToday, recentInstitutions] = await Promise.all([
    query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
        COUNT(*) FILTER (WHERE status = 'active')    AS active,
        COUNT(*) FILTER (WHERE status = 'suspended') AS suspended
      FROM institutions
    `),
    query(`SELECT role, COUNT(*) AS count FROM users GROUP BY role`),
    query(`SELECT COUNT(*) AS count FROM appointments WHERE appointment_date = (NOW() AT TIME ZONE 'Africa/Nairobi')::date`),
    query(`
      SELECT i.id, i.name, i.category, i.status, i.created_at, u.full_name AS owner_name
      FROM institutions i
      JOIN users u ON u.id = i.owner_id
      ORDER BY i.created_at DESC
      LIMIT 5
    `),
  ]);

  const roleCounts = {};
  for (const row of userCounts.rows) roleCounts[row.role] = Number(row.count);

  return {
    institutions: {
      total: Number(institutionCounts.rows[0].total),
      pending: Number(institutionCounts.rows[0].pending),
      active: Number(institutionCounts.rows[0].active),
      suspended: Number(institutionCounts.rows[0].suspended),
    },
    users: {
      total: Object.values(roleCounts).reduce((a, b) => a + b, 0),
      byRole: roleCounts,
    },
    appointmentsToday: Number(apptsToday.rows[0].count),
    recentInstitutions: recentInstitutions.rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      status: r.status,
      ownerName: r.owner_name,
      createdAt: r.created_at,
    })),
  };
}

/**
 * Deeper platform analytics for the Analytics page: user signups by
 * month (real growth trend), appointment volume by month, institutions
 * by category, and the top 5 institutions by appointment count.
 */
async function getPlatformAnalytics() {
  const [signupsByMonth, apptsByMonth, byCategory, topInstitutions] = await Promise.all([
    query(`
      SELECT to_char(date_trunc('month', created_at), 'Mon YYYY') AS month,
             date_trunc('month', created_at) AS month_sort,
             COUNT(*) AS count
      FROM users
      WHERE created_at > NOW() - INTERVAL '6 months'
      GROUP BY month, month_sort
      ORDER BY month_sort ASC
    `),
    query(`
      SELECT to_char(date_trunc('month', created_at), 'Mon YYYY') AS month,
             date_trunc('month', created_at) AS month_sort,
             COUNT(*) AS booked,
             COUNT(*) FILTER (WHERE status = 'completed') AS completed
      FROM appointments
      WHERE created_at > NOW() - INTERVAL '6 months'
      GROUP BY month, month_sort
      ORDER BY month_sort ASC
    `),
    query(`
      SELECT COALESCE(category, 'Other') AS category, COUNT(*) AS count
      FROM institutions
      GROUP BY category
      ORDER BY count DESC
    `),
    query(`
      SELECT i.id, i.name, i.category, COUNT(a.id) AS appointment_count
      FROM institutions i
      LEFT JOIN appointments a ON a.institution_id = i.id
      GROUP BY i.id
      ORDER BY appointment_count DESC
      LIMIT 5
    `),
  ]);

  return {
    signupsByMonth: signupsByMonth.rows.map(r => ({ month: r.month, count: Number(r.count) })),
    appointmentsByMonth: apptsByMonth.rows.map(r => ({
      month: r.month,
      booked: Number(r.booked),
      completed: Number(r.completed),
    })),
    institutionsByCategory: byCategory.rows.map(r => ({ category: r.category, count: Number(r.count) })),
    topInstitutions: topInstitutions.rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      appointmentCount: Number(r.appointment_count),
    })),
  };
}

module.exports = { getPlatformSummary, getPlatformAnalytics };
