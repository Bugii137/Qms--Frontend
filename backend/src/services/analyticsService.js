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

async function getPlatformReport({ from, to, institutionId, category, appointmentStatus, userRole, institutionStatus }) {
  const institutionIdFilter = institutionId || null;
  const categoryFilter = category || null;
  const appointmentStatusFilter = appointmentStatus || null;
  const userRoleFilter = userRole || null;
  const institutionStatusFilter = institutionStatus || null;
  const userParams = [from, to, institutionIdFilter, categoryFilter, userRoleFilter, institutionStatusFilter];
  const institutionParams = [from, to, institutionIdFilter, categoryFilter, institutionStatusFilter];
  const appointmentParams = [from, to, institutionIdFilter, categoryFilter, appointmentStatusFilter, institutionStatusFilter];
  const dateRange = `created_at AT TIME ZONE 'Africa/Nairobi' >= $1::date
    AND created_at AT TIME ZONE 'Africa/Nairobi' < ($2::date + INTERVAL '1 day')`;
  const institutionFilter = `($3::integer IS NULL OR id = $3)
    AND ($4::text IS NULL OR category = $4)
    AND ($5::text IS NULL OR status = $5)`;
  const appointmentInstitutionFilter = `($3::integer IS NULL OR i.id = $3)
    AND ($4::text IS NULL OR i.category = $4)
    AND ($6::text IS NULL OR i.status = $6)
    AND ($5::text IS NULL OR a.status = $5)`;
  const [userCounts, institutionCounts, appointmentCounts, dailyVolume, topInstitutions, appointments, institutionRecords, userRecords, filterOptions] = await Promise.all([
    query(
      `SELECT role, COUNT(*) AS count
       FROM users
       WHERE ${dateRange}
         AND ($5::text IS NULL OR role = $5)
         AND (($3::integer IS NULL AND $4::text IS NULL AND $6::text IS NULL) OR id IN (
           SELECT owner_id FROM institutions
           WHERE ($3::integer IS NULL OR id = $3)
             AND ($4::text IS NULL OR category = $4)
             AND ($6::text IS NULL OR status = $6)
         ))
       GROUP BY role
       ORDER BY role`,
      userParams
    ),
    query(
      `SELECT status, COUNT(*) AS count
       FROM institutions
       WHERE ${dateRange} AND ${institutionFilter}
       GROUP BY status
       ORDER BY status`,
      institutionParams
    ),
    query(
      `SELECT a.status, COUNT(*) AS count
       FROM appointments a
       JOIN institutions i ON i.id = a.institution_id
       WHERE a.appointment_date BETWEEN $1::date AND $2::date
         AND ${appointmentInstitutionFilter}
       GROUP BY a.status
       ORDER BY a.status`,
      appointmentParams
    ),
    query(
      `SELECT a.appointment_date AS date, COUNT(*) AS count
       FROM appointments a
       JOIN institutions i ON i.id = a.institution_id
       WHERE a.appointment_date BETWEEN $1::date AND $2::date
         AND ${appointmentInstitutionFilter}
       GROUP BY a.appointment_date
       ORDER BY a.appointment_date`,
      appointmentParams
    ),
    query(
      `SELECT i.id, i.name, i.category,
              COUNT(a.id) AS appointment_count,
              COUNT(a.id) FILTER (WHERE a.status = 'completed') AS completed_count
       FROM institutions i
       LEFT JOIN appointments a
         ON a.institution_id = i.id
        AND a.appointment_date BETWEEN $1::date AND $2::date
        AND ($5::text IS NULL OR a.status = $5)
       WHERE ($3::integer IS NULL OR i.id = $3)
         AND ($4::text IS NULL OR i.category = $4)
         AND ($6::text IS NULL OR i.status = $6)
       GROUP BY i.id
       HAVING COUNT(a.id) > 0
       ORDER BY appointment_count DESC, i.name ASC
       LIMIT 10`,
      appointmentParams
    ),
    query(
      `SELECT i.name AS institution_name,
              c.full_name AS client_name,
              s.name AS service_name,
              a.appointment_date,
              to_char(a.appointment_time, 'HH24:MI') AS appointment_time,
              a.status
       FROM appointments a
       JOIN institutions i ON i.id = a.institution_id
       JOIN users c ON c.id = a.client_id
       JOIN services s ON s.id = a.service_id
       WHERE a.appointment_date BETWEEN $1::date AND $2::date
         AND ${appointmentInstitutionFilter}
       ORDER BY a.appointment_date, a.appointment_time, i.name`,
      appointmentParams
    ),
    query(
      `SELECT i.id, i.name, i.category, i.status,
              u.full_name AS owner_name,
              i.created_at AT TIME ZONE 'Africa/Nairobi' AS created_at,
              COUNT(a.id) AS appointment_count,
              COUNT(a.id) FILTER (WHERE a.status = 'completed') AS completed_count
       FROM institutions i
       JOIN users u ON u.id = i.owner_id
       LEFT JOIN appointments a
         ON a.institution_id = i.id
        AND a.appointment_date BETWEEN $1::date AND $2::date
        AND ($5::text IS NULL OR a.status = $5)
       WHERE i.created_at AT TIME ZONE 'Africa/Nairobi' >= $1::date
         AND i.created_at AT TIME ZONE 'Africa/Nairobi' < ($2::date + INTERVAL '1 day')
         AND ($3::integer IS NULL OR i.id = $3)
         AND ($4::text IS NULL OR i.category = $4)
         AND ($6::text IS NULL OR i.status = $6)
       GROUP BY i.id, u.full_name
       ORDER BY i.name`,
      appointmentParams
    ),
    query(
      `SELECT u.full_name, u.email, u.role, u.is_active,
              u.created_at AT TIME ZONE 'Africa/Nairobi' AS created_at
       FROM users u
       WHERE ${dateRange}
         AND ($5::text IS NULL OR u.role = $5)
         AND (($3::integer IS NULL AND $4::text IS NULL AND $6::text IS NULL) OR u.id IN (
           SELECT owner_id FROM institutions
           WHERE ($3::integer IS NULL OR id = $3)
             AND ($4::text IS NULL OR category = $4)
             AND ($6::text IS NULL OR status = $6)
         ))
       ORDER BY u.created_at DESC, u.full_name`,
      userParams
    ),
    query(
      `SELECT id, name, category, status FROM institutions ORDER BY name`
    ),
  ]);

  const toCounts = (rows) => Object.fromEntries(rows.map(row => [row.status || row.role, Number(row.count)]));
  const userByRole = toCounts(userCounts.rows);
  const institutionByStatus = toCounts(institutionCounts.rows);
  const appointmentByStatus = toCounts(appointmentCounts.rows);

  return {
    period: { from, to },
    users: {
      total: Object.values(userByRole).reduce((sum, count) => sum + count, 0),
      byRole: userByRole,
    },
    institutions: {
      applications: Object.values(institutionByStatus).reduce((sum, count) => sum + count, 0),
      byStatus: institutionByStatus,
    },
    appointments: {
      total: Object.values(appointmentByStatus).reduce((sum, count) => sum + count, 0),
      byStatus: appointmentByStatus,
      dailyVolume: dailyVolume.rows.map(row => ({
        date: row.date,
        count: Number(row.count),
      })),
      records: appointments.rows.map(row => ({
        institutionName: row.institution_name,
        clientName: row.client_name,
        serviceName: row.service_name,
        appointmentDate: row.appointment_date,
        appointmentTime: row.appointment_time,
        status: row.status,
      })),
    },
    institutionRecords: institutionRecords.rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      status: row.status,
      ownerName: row.owner_name,
      createdAt: row.created_at,
      appointmentCount: Number(row.appointment_count),
      completedCount: Number(row.completed_count),
    })),
    userRecords: userRecords.rows.map(row => ({
      name: row.full_name,
      email: row.email,
      role: row.role,
      active: row.is_active,
      createdAt: row.created_at,
    })),
    topInstitutions: topInstitutions.rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      appointmentCount: Number(row.appointment_count),
      completedCount: Number(row.completed_count),
    })),
    filterOptions: {
      institutions: filterOptions.rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        status: row.status,
      })),
      categories: [...new Set(filterOptions.rows.map(row => row.category).filter(Boolean))].sort(),
    },
  };
}

module.exports = { getPlatformSummary, getPlatformAnalytics, getPlatformReport };
