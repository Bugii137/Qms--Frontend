const { randomInt } = require('crypto');
const { query } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const notificationService = require('./notificationService');
const { appointmentNotificationEmail } = require('../utils/emailTemplates');
const { todayLocal } = require('../utils/date');

const TICKET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TICKET_LENGTH = 5;

function createTicketNumber() {
  let ticket = 'QMS-';
  for (let i = 0; i < TICKET_LENGTH; i += 1) {
    ticket += TICKET_ALPHABET[randomInt(TICKET_ALPHABET.length)];
  }
  return ticket;
}

function toPublicAppointment(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    institutionId: row.institution_id,
    institutionName: row.institution_name,
    serviceId: row.service_id,
    serviceName: row.service_name,
    durationMinutes: row.duration_minutes,
    staffId: row.staff_id,
    staffName: row.staff_name,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    ticketNumber: row.ticket_number,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

const SELECT_APPOINTMENT = `
  SELECT a.*,
         c.full_name AS client_name, c.phone AS client_phone,
         i.name AS institution_name,
         s.name AS service_name, s.duration_minutes,
         st.full_name AS staff_name
  FROM appointments a
  JOIN users c ON c.id = a.client_id
  JOIN institutions i ON i.id = a.institution_id
  JOIN services s ON s.id = a.service_id
  LEFT JOIN users st ON st.id = a.staff_id
`;

const APPOINTMENT_NOTIFICATION_EVENTS = {
  requested: {
    emailPreference: 'emailConfirmed',
    appPreference: 'appConfirmed',
    title: 'Booking request received',
    message: appointment => `Your booking for ${appointment.serviceName} at ${appointment.institutionName} is pending approval.`,
  },
  approved: {
    emailPreference: 'emailApproved',
    appPreference: 'appApproved',
    title: 'Appointment approved',
    message: appointment => appointment.ticketNumber
      ? `Your appointment for ${appointment.serviceName} at ${appointment.institutionName} was approved. Your ticket number is ${appointment.ticketNumber}.`
      : `Your appointment for ${appointment.serviceName} at ${appointment.institutionName} was approved.`,
  },
  rejected: {
    emailPreference: 'emailRejected',
    appPreference: 'appRejected',
    title: 'Appointment declined',
    message: appointment => `Your appointment for ${appointment.serviceName} at ${appointment.institutionName} was declined.`,
  },
  rescheduled: {
    emailPreference: 'emailRescheduled',
    appPreference: 'appRescheduled',
    title: 'Appointment rescheduled',
    message: appointment => `Your appointment for ${appointment.serviceName} at ${appointment.institutionName} is now scheduled for ${appointment.appointmentDate} at ${appointment.appointmentTime}.`,
  },
  follow_up: {
    emailPreference: 'emailConfirmed',
    appPreference: 'appConfirmed',
    title: 'Follow-up appointment scheduled',
    message: appointment => `A follow-up for ${appointment.serviceName} at ${appointment.institutionName} is scheduled for ${appointment.appointmentDate} at ${appointment.appointmentTime}. It is pending approval.`,
  },
  cancelled: {
    emailPreference: 'emailCancelled',
    appPreference: 'appCancelled',
    title: 'Appointment cancelled',
    message: appointment => `Your appointment for ${appointment.serviceName} at ${appointment.institutionName} was cancelled.`,
  },
  completed: {
    emailPreference: 'emailCompleted',
    appPreference: 'appCompleted',
    title: 'Appointment completed',
    message: appointment => `Your appointment for ${appointment.serviceName} at ${appointment.institutionName} is complete.`,
  },
};

async function notifyClient(appointment, event) {
  const eventDetails = APPOINTMENT_NOTIFICATION_EVENTS[event];
  if (!eventDetails) return;

  await notificationService.notifyAppointment(appointment.clientId, {
    ...eventDetails,
    message: eventDetails.message(appointment),
    emailMessage: appointmentNotificationEmail({
      clientName: appointment.clientName,
      institutionName: appointment.institutionName,
      serviceName: appointment.serviceName,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      event,
      ticketNumber: appointment.ticketNumber,
    }),
  });
}

/**
 * A client books an appointment. Confirms the service belongs to the given
 * institution and is active before allowing the booking.
 */
async function book(clientId, { institutionId, serviceId, appointmentDate, appointmentTime, notes }) {
  const { rows: serviceRows } = await query(
    `SELECT s.*
     FROM services s
     JOIN institutions i ON i.id = s.institution_id
     WHERE s.id = $1 AND s.institution_id = $2
       AND s.is_active = TRUE AND i.status = 'active'`,
    [serviceId, institutionId]
  );
  if (!serviceRows[0]) {
    throw new AppError('This service is not available at this institution', 400);
  }

  let rows;
  try {
    ({ rows } = await query(
      `INSERT INTO appointments (client_id, institution_id, service_id, appointment_date, appointment_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [clientId, institutionId, serviceId, appointmentDate, appointmentTime, notes || null]
    ));
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'idx_appointments_active_slot') {
      throw new AppError('This appointment slot is already booked', 409);
    }
    throw err;
  }

  const appointment = await getByIdRaw(rows[0].id);
  await notifyClient(appointment, 'requested');
  return appointment;
}

async function getByIdRaw(id) {
  const { rows } = await query(`${SELECT_APPOINTMENT} WHERE a.id = $1`, [id]);
  if (!rows[0]) throw new AppError('Appointment not found', 404);
  return toPublicAppointment(rows[0]);
}

/**
 * A client's own appointment history.
 */
async function listByClient(clientId, { status } = {}) {
  const conditions = ['a.client_id = $1'];
  const params = [clientId];

  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }

  const { rows } = await query(
    `${SELECT_APPOINTMENT} WHERE ${conditions.join(' AND ')} ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
    params
  );
  return rows.map(toPublicAppointment);
}

async function getOwnedInstitutionId(ownerId) {
  const { rows } = await query('SELECT id FROM institutions WHERE owner_id = $1', [ownerId]);
  if (!rows[0]) throw new AppError('You do not have an institution yet', 404);
  return rows[0].id;
}

/**
 * All appointments for the institution_admin's own institution.
 */
async function listByInstitutionOwner(ownerId, { status, date } = {}) {
  const institutionId = await getOwnedInstitutionId(ownerId);
  return listForInstitution(institutionId, { status, date });
}

async function getInstitutionReport(ownerId, { from, to, status, serviceId }) {
  const institutionId = await getOwnedInstitutionId(ownerId);
  const [institutionResult, appointmentResult, serviceResult] = await Promise.all([
    query('SELECT name FROM institutions WHERE id = $1', [institutionId]),
    query(
      `SELECT a.id, a.appointment_date, to_char(a.appointment_time, 'HH24:MI') AS appointment_time,
              a.status, c.full_name AS client_name,
              s.id AS service_id, s.name AS service_name, st.full_name AS staff_name
       FROM appointments a
       JOIN users c ON c.id = a.client_id
       JOIN services s ON s.id = a.service_id
       LEFT JOIN users st ON st.id = a.staff_id
       WHERE a.institution_id = $1
         AND a.appointment_date BETWEEN $2::date AND $3::date
         AND ($4::text IS NULL OR a.status = $4)
         AND ($5::integer IS NULL OR a.service_id = $5)
       ORDER BY a.appointment_date, a.appointment_time, a.id`,
      [institutionId, from, to, status || null, serviceId || null]
    ),
    query(
      `SELECT id, name, is_active
       FROM services
       WHERE institution_id = $1
       ORDER BY name`,
      [institutionId]
    ),
  ]);
  const rows = appointmentResult.rows;
  const byStatus = {};
  const byDate = new Map();
  const byService = new Map();

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    const date = String(row.appointment_date).slice(0, 10);
    byDate.set(date, (byDate.get(date) || 0) + 1);
    const service = byService.get(row.service_id) || {
      id: row.service_id,
      name: row.service_name,
      appointmentCount: 0,
      completedCount: 0,
    };
    service.appointmentCount += 1;
    if (row.status === 'completed') service.completedCount += 1;
    byService.set(row.service_id, service);
  }

  return {
    institutionName: institutionResult.rows[0].name,
    period: { from, to },
    total: rows.length,
    byStatus,
    dailyVolume: [...byDate.entries()]
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, count]) => ({ date, count })),
    topServices: [...byService.values()]
      .sort((a, b) => b.appointmentCount - a.appointmentCount || a.name.localeCompare(b.name))
      .slice(0, 5),
    services: serviceResult.rows.map(service => ({
      id: service.id,
      name: service.name,
      active: service.is_active,
    })),
    appointments: rows.map(row => ({
      id: row.id,
      clientName: row.client_name,
      serviceId: row.service_id,
      serviceName: row.service_name,
      appointmentDate: String(row.appointment_date).slice(0, 10),
      appointmentTime: row.appointment_time,
      status: row.status,
      staffName: row.staff_name,
    })),
  };
}

/**
 * Schedule a follow-up for a client who has completed an appointment here.
 */
async function rebookForClient(ownerId, { clientId, serviceId, appointmentDate, appointmentTime, notes }) {
  const institutionId = await getOwnedInstitutionId(ownerId);

  const parsedDate = new Date(`${appointmentDate}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== appointmentDate) {
    throw new AppError('A valid appointment date is required', 400);
  }
  if (appointmentDate < todayLocal()) {
    throw new AppError('A follow-up appointment must be scheduled for today or a future date', 400);
  }

  const { rows: historyRows } = await query(
    `SELECT id FROM appointments
     WHERE client_id = $1 AND institution_id = $2 AND status = 'completed'
     LIMIT 1`,
    [clientId, institutionId]
  );
  if (!historyRows[0]) {
    throw new AppError('A follow-up can only be scheduled for a client who has completed an appointment here', 400);
  }

  const { rows: serviceRows } = await query(
    `SELECT id FROM services
     WHERE id = $1 AND institution_id = $2 AND is_active = TRUE`,
    [serviceId, institutionId]
  );
  if (!serviceRows[0]) {
    throw new AppError('This service is not available at this institution', 400);
  }

  let rows;
  try {
    ({ rows } = await query(
      `INSERT INTO appointments (client_id, institution_id, service_id, appointment_date, appointment_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [clientId, institutionId, serviceId, appointmentDate, appointmentTime, notes || null]
    ));
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'idx_appointments_active_slot') {
      throw new AppError('This appointment slot is already booked', 409);
    }
    throw err;
  }

  const appointment = await getByIdRaw(rows[0].id);
  await notifyClient(appointment, 'follow_up');
  return appointment;
}

async function listForInstitution(institutionId, { status, date, queueOrder = false } = {}) {
  const conditions = ['a.institution_id = $1'];
  const params = [institutionId];

  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }
  if (date) {
    params.push(date);
    conditions.push(`a.appointment_date = $${params.length}`);
  }

  const { rows } = await query(
    `${SELECT_APPOINTMENT} WHERE ${conditions.join(' AND ')} ORDER BY ${
      queueOrder
        ? 'a.queue_number ASC NULLS LAST, a.appointment_time ASC, a.id ASC'
        : 'a.appointment_date ASC, a.appointment_time ASC'
    }`,
    params
  );
  return rows.map(toPublicAppointment);
}

/**
 * Appointments assigned to (or bookable by) a specific staff member,
 * scoped to their institution. Used by the staff Appointments page.
 */
async function listForStaff(staffUserId, { status, date } = {}) {
  const { rows: staffRows } = await query(
    `SELECT institution_id FROM institution_staff WHERE user_id = $1 AND status = 'active'`,
    [staffUserId]
  );
  if (!staffRows[0]) throw new AppError('No active staff assignment found', 404);

  const conditions = ['a.institution_id = $1'];
  const params = [staffRows[0].institution_id];

  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }
  if (date) {
    params.push(date);
    conditions.push(`a.appointment_date = $${params.length}`);
  }

  const { rows } = await query(
    `${SELECT_APPOINTMENT} WHERE ${conditions.join(' AND ')} ORDER BY a.appointment_time ASC`,
    params
  );
  return rows.map(toPublicAppointment);
}

/**
 * Confirms the caller (institution_admin owner or active staff) has
 * management rights over this appointment's institution.
 */
async function assertManagesAppointment(user, appointmentId) {
  const { rows } = await query(`${SELECT_APPOINTMENT} WHERE a.id = $1`, [appointmentId]);
  const appointment = rows[0];
  if (!appointment) throw new AppError('Appointment not found', 404);

  if (user.role === 'institution_admin') {
    const { rows: ownerRows } = await query('SELECT id FROM institutions WHERE id = $1 AND owner_id = $2', [
      appointment.institution_id,
      user.id,
    ]);
    if (!ownerRows[0]) throw new AppError('Appointment not found', 404);
  } else if (user.role === 'staff') {
    const { rows: staffRows } = await query(
      `SELECT access_level FROM institution_staff
       WHERE user_id = $1 AND institution_id = $2 AND status = 'active'`,
      [user.id, appointment.institution_id]
    );
    if (!staffRows[0]) throw new AppError('Appointment not found', 404);
    if (staffRows[0].access_level === 'view_only') {
      throw new AppError('Your access level does not allow managing appointments', 403);
    }
  } else {
    throw new AppError('You do not have permission to manage this appointment', 403);
  }

  return appointment;
}

async function setStatus(user, appointmentId, status) {
  const validStatuses = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid status value', 400);
  }

  const existing = await assertManagesAppointment(user, appointmentId);
  if (existing.status === status) return getByIdRaw(appointmentId);

  // When an appointment is approved, assign it a queue token if it doesn't
  // already have one. Keep the numeric sequence private for queue ordering,
  // and give the client a random alphanumeric ticket identifier.
  let queueNumber = existing.queue_number;
  let ticketNumber = existing.ticket_number;
  if (status === 'approved' && !queueNumber) {
    const { rows: seqRows } = await query(
      `SELECT COALESCE(MAX(queue_number), 0) + 1 AS next_number
       FROM appointments
       WHERE institution_id = $1 AND appointment_date = $2 AND queue_number IS NOT NULL`,
      [existing.institution_id, existing.appointment_date]
    );
    queueNumber = seqRows[0].next_number;
  }
  for (let attempt = 0; ; attempt += 1) {
    if (status === 'approved' && !ticketNumber) {
      ticketNumber = createTicketNumber();
    }

    try {
      await query(
        `UPDATE appointments
         SET status = $1, queue_number = COALESCE($2, queue_number),
             ticket_number = COALESCE($3, ticket_number), updated_at = NOW()
         WHERE id = $4 RETURNING client_id`,
        [status, queueNumber, ticketNumber, appointmentId]
      );
      break;
    } catch (err) {
      const ticketCollision = err.code === '23505'
        && err.constraint === 'idx_appointments_ticket_number';
      if (!ticketCollision || status !== 'approved' || existing.ticket_number || attempt >= 4) {
        throw err;
      }
      ticketNumber = null;
    }
  }

  const updated = await getByIdRaw(appointmentId);
  await notifyClient(updated, status);
  return updated;
}

/**
 * A client cancelling their own appointment (only while pending/approved).
 */
async function cancelByClient(clientId, appointmentId) {
  const { rows } = await query(
    `SELECT * FROM appointments WHERE id = $1 AND client_id = $2`,
    [appointmentId, clientId]
  );
  if (!rows[0]) throw new AppError('Appointment not found', 404);
  if (!['pending', 'approved'].includes(rows[0].status)) {
    throw new AppError('This appointment can no longer be cancelled', 400);
  }

  await query(`UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [
    appointmentId,
  ]);

  const updated = await getByIdRaw(appointmentId);
  await notifyClient(updated, 'cancelled');
  return updated;
}

async function updateAppointment(user, appointmentId, updates) {
  let existingAppointment;
  if (user.role === 'client') {
    const { rows } = await query(
      `${SELECT_APPOINTMENT} WHERE a.id = $1 AND a.client_id = $2`,
      [appointmentId, user.id]
    );
    existingAppointment = rows[0];
    if (!existingAppointment) throw new AppError('Appointment not found', 404);
    if (existingAppointment.status !== 'pending') {
      throw new AppError('Only pending appointments can be edited by the client', 400);
    }
  } else {
    existingAppointment = await assertManagesAppointment(user, appointmentId);
  }

  if (updates.appointmentDate) {
    const parsed = new Date(`${updates.appointmentDate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== updates.appointmentDate) {
      throw new AppError('A valid appointment date is required', 400);
    }
    if (updates.appointmentDate < todayLocal()) {
      throw new AppError('Appointments must be scheduled for today or a future date', 400);
    }
  }

  const columns = {
    appointmentDate: 'appointment_date',
    appointmentTime: 'appointment_time',
    notes: 'notes',
  };
  const setClauses = [];
  const params = [appointmentId];
  for (const [field, column] of Object.entries(columns)) {
    if (updates[field] !== undefined) {
      params.push(updates[field] || null);
      setClauses.push(`${column} = $${params.length}`);
    }
  }
  if (!setClauses.length) throw new AppError('No valid fields provided to update', 400);

  try {
    await query(
      `UPDATE appointments SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $1`,
      params
    );
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'idx_appointments_active_slot') {
      throw new AppError('This appointment slot is already booked', 409);
    }
    throw err;
  }
  const updated = await getByIdRaw(appointmentId);
  const existingDate = existingAppointment.appointment_date instanceof Date
    ? existingAppointment.appointment_date.toISOString().slice(0, 10)
    : String(existingAppointment.appointment_date).slice(0, 10);
  const dateChanged = updates.appointmentDate !== undefined
    && existingDate !== updates.appointmentDate;
  const timeChanged = updates.appointmentTime !== undefined
    && String(existingAppointment.appointment_time).slice(0, 5) !== updates.appointmentTime;
  if (user.role !== 'client' && (dateChanged || timeChanged)) {
    await notifyClient(updated, 'rescheduled');
  }
  return updated;
}

async function deleteAppointment(user, appointmentId) {
  if (user.role === 'client') {
    return cancelByClient(user.id, appointmentId);
  }
  return setStatus(user, appointmentId, 'cancelled');
}

/**
 * Assign (or reassign) a staff member to an appointment. Institution
 * admin only — used from the institution Appointments page.
 */
async function assignStaff(ownerId, appointmentId, staffUserId) {
  const institutionId = await getOwnedInstitutionId(ownerId);

  const { rows: apptRows } = await query(
    'SELECT id FROM appointments WHERE id = $1 AND institution_id = $2',
    [appointmentId, institutionId]
  );
  if (!apptRows[0]) throw new AppError('Appointment not found', 404);

  if (staffUserId) {
    const { rows: staffRows } = await query(
      `SELECT id FROM institution_staff WHERE user_id = $1 AND institution_id = $2 AND status = 'active'`,
      [staffUserId, institutionId]
    );
    if (!staffRows[0]) throw new AppError('That staff member is not part of this institution', 400);
  }

  await query('UPDATE appointments SET staff_id = $1, updated_at = NOW() WHERE id = $2', [
    staffUserId || null,
    appointmentId,
  ]);

  return getByIdRaw(appointmentId);
}

/**
 * Today's queue for an institution: approved appointments for today,
 * grouped by service, ordered by time. Powers Queue Management's
 * "waiting" lists and "Call Next" (which just marks the current
 * front-of-line appointment completed and moves to the next).
 */
async function getQueueForInstitutionOwner(ownerId) {
  const institutionId = await getOwnedInstitutionId(ownerId);
  const today = todayLocal();

  const appointments = await listForInstitution(institutionId, {
    status: 'approved',
    date: today,
    queueOrder: true,
  });

  const byService = {};
  for (const appt of appointments) {
    if (!byService[appt.serviceId]) {
      byService[appt.serviceId] = { serviceId: appt.serviceId, serviceName: appt.serviceName, waiting: [] };
    }
    byService[appt.serviceId].waiting.push(appt);
  }

  return Object.values(byService);
}

/**
 * "Call next": marks the given appointment as completed, freeing up
 * the front of that service's queue.
 */
async function callNext(ownerId, appointmentId) {
  const institutionId = await getOwnedInstitutionId(ownerId);
  const { rows } = await query(
    `SELECT id FROM appointments WHERE id = $1 AND institution_id = $2 AND status = 'approved'`,
    [appointmentId, institutionId]
  );
  if (!rows[0]) throw new AppError('Appointment not found in this institution\'s active queue', 404);

  return setStatus({ id: ownerId, role: 'institution_admin' }, appointmentId, 'completed');
}

/**
 * A client's live position in today's queue for one of their own approved
 * appointments. The rank uses the same queue-number/appointment-time/id
 * ordering as institution Queue Management, so both screens describe the
 * same position.
 */
async function getQueuePosition(clientId, appointmentId) {
  const { rows } = await query(
    `SELECT * FROM appointments WHERE id = $1 AND client_id = $2`,
    [appointmentId, clientId]
  );
  const appointment = rows[0];
  if (!appointment) throw new AppError('Appointment not found', 404);
  if (appointment.status !== 'approved') {
    throw new AppError('This appointment is not currently in the queue', 400);
  }

  const { rows: positionRows } = await query(
    `WITH ordered AS (
       SELECT id,
              ROW_NUMBER() OVER (
                ORDER BY queue_number ASC NULLS LAST,
                         appointment_time ASC,
                         id ASC
              ) AS position
       FROM appointments
       WHERE institution_id = $1
         AND service_id = $2
         AND appointment_date = $3
         AND status = 'approved'
     )
     SELECT position
     FROM ordered
     WHERE id = $4`,
    [appointment.institution_id, appointment.service_id, appointment.appointment_date, appointmentId]
  );

  if (!positionRows[0]) {
    throw new AppError('This appointment is not currently in the queue', 400);
  }

  return { position: Number(positionRows[0].position) };
}

module.exports = {
  book,
  listByClient,
  listByInstitutionOwner,
  getInstitutionReport,
  rebookForClient,
  listForStaff,
  setStatus,
  cancelByClient,
  updateAppointment,
  deleteAppointment,
  assignStaff,
  getQueueForInstitutionOwner,
  callNext,
  getByIdRaw,
  getQueuePosition,
};
