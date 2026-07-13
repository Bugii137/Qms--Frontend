const { query } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const notificationService = require('./notificationService');

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
    queueNumber: row.queue_number,
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

/**
 * A client books an appointment. Confirms the service belongs to the given
 * institution and is active before allowing the booking.
 */
async function book(clientId, { institutionId, serviceId, appointmentDate, appointmentTime, notes }) {
  const { rows: serviceRows } = await query(
    `SELECT * FROM services WHERE id = $1 AND institution_id = $2 AND is_active = TRUE`,
    [serviceId, institutionId]
  );
  if (!serviceRows[0]) {
    throw new AppError('This service is not available at this institution', 400);
  }

  const { rows } = await query(
    `INSERT INTO appointments (client_id, institution_id, service_id, appointment_date, appointment_time, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [clientId, institutionId, serviceId, appointmentDate, appointmentTime, notes || null]
  );

  const appointment = await getByIdRaw(rows[0].id);

  await notificationService.create(clientId, {
    type: 'appointment',
    title: 'Appointment requested',
    message: `Your booking for ${appointment.serviceName} at ${appointment.institutionName} is pending approval.`,
  });

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

async function listForInstitution(institutionId, { status, date } = {}) {
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
    `${SELECT_APPOINTMENT} WHERE ${conditions.join(' AND ')} ORDER BY a.appointment_date ASC, a.appointment_time ASC`,
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

  await assertManagesAppointment(user, appointmentId);

  const { rows } = await query(
    `UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING client_id`,
    [status, appointmentId]
  );

  const updated = await getByIdRaw(appointmentId);

  const statusMessages = {
    approved: `Your appointment for ${updated.serviceName} at ${updated.institutionName} was approved.`,
    rejected: `Your appointment for ${updated.serviceName} at ${updated.institutionName} was declined.`,
    completed: `Your appointment for ${updated.serviceName} at ${updated.institutionName} is complete.`,
    cancelled: `Your appointment for ${updated.serviceName} at ${updated.institutionName} was cancelled.`,
  };

  if (statusMessages[status]) {
    await notificationService.create(rows[0].client_id, {
      type: 'appointment',
      title: 'Appointment update',
      message: statusMessages[status],
    });
  }

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

  return getByIdRaw(appointmentId);
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
  const today = new Date().toISOString().slice(0, 10);

  const appointments = await listForInstitution(institutionId, { status: 'approved', date: today });

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
 * appointments: how many other approved appointments for the same
 * institution + service + date have an earlier time (i.e. are ahead of
 * them). Powers the client dashboard's Queue Position widget without
 * exposing other clients' identities.
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

  const { rows: aheadRows } = await query(
    `SELECT COUNT(*) AS ahead FROM appointments
     WHERE institution_id = $1 AND service_id = $2 AND appointment_date = $3
       AND status = 'approved' AND appointment_time < $4`,
    [appointment.institution_id, appointment.service_id, appointment.appointment_date, appointment.appointment_time]
  );

  return { position: Number(aheadRows[0].ahead) + 1 };
}

module.exports = {
  book,
  listByClient,
  listByInstitutionOwner,
  listForStaff,
  setStatus,
  cancelByClient,
  assignStaff,
  getQueueForInstitutionOwner,
  callNext,
  getByIdRaw,
  getQueuePosition,
};
