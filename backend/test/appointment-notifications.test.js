const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../src/db');
let queryHandler;
db.query = (text, params) => queryHandler(text, params);

const emailConfig = require('../src/config/email');
const sentEmails = [];
emailConfig.sendEmail = async message => {
  sentEmails.push(message);
  return { accepted: [message.to] };
};

const notificationService = require('../src/services/notificationService');
const appointmentService = require('../src/services/appointmentService');
const { appointmentNotificationEmail } = require('../src/utils/emailTemplates');

let appointment;
let preferences;
let inAppNotifications;

function makeAppointment() {
  return {
    id: 21,
    client_id: 7,
    institution_id: 3,
    service_id: 5,
    staff_id: null,
    appointment_date: '2026-11-27',
    appointment_time: '10:30:00',
    queue_number: null,
    ticket_number: null,
    status: 'pending',
    client_name: 'Client One',
    client_phone: null,
    institution_name: 'Metro Clinic',
    service_name: 'Consultation',
    duration_minutes: 30,
    staff_name: null,
  };
}

test.beforeEach(() => {
  appointment = makeAppointment();
  preferences = { ...notificationService.PREFERENCE_DEFAULTS };
  sentEmails.length = 0;
  inAppNotifications = [];
  queryHandler = async (text, params = []) => {
    if (text.includes('FROM appointments a')) {
      return { rows: [{ ...appointment }] };
    }
    if (text.trim().startsWith('SELECT * FROM appointments WHERE id =')) {
      return { rows: [{ ...appointment }] };
    }
    if (text.startsWith('SELECT id FROM institutions')) {
      return { rows: [{ id: appointment.institution_id }] };
    }
    if (text.includes('SELECT id FROM appointments') && text.includes("status = 'completed'")) {
      return { rows: [{ id: 19 }] };
    }
    if (text.includes('WITH ordered AS')) {
      return { rows: [{ position: 3 }] };
    }
    if (text.includes('SELECT notification_preferences FROM users')) {
      return { rows: [{ notification_preferences: preferences }] };
    }
    if (text.startsWith('UPDATE users')) {
      preferences = { ...preferences, ...JSON.parse(params[1]) };
      return { rows: [{ notification_preferences: preferences }] };
    }
    if (text.includes('FROM services s')) {
      return { rows: [{ id: appointment.service_id }] };
    }
    if (text.includes('SELECT id FROM services')) {
      return { rows: [{ id: appointment.service_id }] };
    }
    if (text.startsWith('INSERT INTO appointments')) {
      appointment.appointment_date = params[3];
      appointment.appointment_time = params[4];
      return { rows: [{ id: appointment.id }] };
    }
    if (text.includes('COALESCE(MAX(queue_number)')) {
      return { rows: [{ next_number: 4 }] };
    }
    if (text.includes('SELECT email, notification_preferences') && text.includes('FROM users')) {
      return { rows: [{ email: 'client@example.test', notification_preferences: preferences }] };
    }
    if (text.startsWith('INSERT INTO notifications')) {
      const notification = {
        id: inAppNotifications.length + 1,
        user_id: params[0],
        type: params[1],
        title: params[2],
        message: params[3],
        is_read: false,
        created_at: new Date(),
      };
      inAppNotifications.push(notification);
      return { rows: [notification] };
    }
    if (text.includes("UPDATE appointments SET status = 'cancelled'")) {
      appointment.status = 'cancelled';
      return { rows: [{ id: appointment.id }] };
    }
    if (text.startsWith('UPDATE appointments') && text.includes('SET status =')) {
      appointment.status = params[0];
      appointment.queue_number = params[1] || appointment.queue_number;
      appointment.ticket_number = params[2] || appointment.ticket_number;
      return { rows: [{ client_id: appointment.client_id }] };
    }
    if (text.startsWith('UPDATE appointments')) {
      appointment.appointment_date = params[1] || appointment.appointment_date;
      appointment.appointment_time = params[2] || appointment.appointment_time;
      return { rows: [{ client_id: appointment.client_id }] };
    }
    throw new Error(`Unexpected SQL in test: ${text}`);
  };
});

test('approval emails the client once and includes the assigned ticket', async () => {
  const approved = await appointmentService.setStatus(
    { id: 10, role: 'institution_admin' },
    appointment.id,
    'approved'
  );

  assert.equal(approved.status, 'approved');
  assert.match(approved.ticketNumber, /^QMS-/);
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, 'client@example.test');
  assert.equal(sentEmails[0].subject, 'Your appointment was approved');
  assert.match(sentEmails[0].text, new RegExp(approved.ticketNumber));
  assert.equal(inAppNotifications.length, 1);

  await appointmentService.setStatus(
    { id: 10, role: 'institution_admin' },
    appointment.id,
    'approved'
  );
  assert.equal(sentEmails.length, 1);
});

test('a new booking sends a request receipt while approval is pending', async () => {
  const booked = await appointmentService.book(appointment.client_id, {
    institutionId: appointment.institution_id,
    serviceId: appointment.service_id,
    appointmentDate: appointment.appointment_date,
    appointmentTime: '10:30',
  });

  assert.equal(booked.status, 'pending');
  assert.equal(sentEmails[0].subject, 'Booking request received');
  assert.match(sentEmails[0].text, /awaiting approval/);
  assert.equal(inAppNotifications[0].title, 'Booking request received');
});

test('institution follow-up scheduling sends one follow-up notification', async () => {
  const followUp = await appointmentService.rebookForClient(
    10,
    {
      clientId: appointment.client_id,
      serviceId: appointment.service_id,
      appointmentDate: '2026-11-28',
      appointmentTime: '11:30',
    }
  );

  assert.equal(followUp.appointmentDate, '2026-11-28');
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].subject, 'A follow-up appointment was scheduled');
  assert.equal(inAppNotifications.length, 1);
  assert.equal(inAppNotifications[0].title, 'Follow-up appointment scheduled');
});

test('client cancellation sends exactly one cancellation notification', async () => {
  appointment.status = 'approved';

  const cancelled = await appointmentService.cancelByClient(
    appointment.client_id,
    appointment.id
  );

  assert.equal(cancelled.status, 'cancelled');
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].subject, 'Your appointment was cancelled');
  assert.equal(inAppNotifications.length, 1);
  assert.equal(inAppNotifications[0].title, 'Appointment cancelled');
});

test('declining a booking sends the declined email and in-app alert', async () => {
  await appointmentService.setStatus(
    { id: 10, role: 'institution_admin' },
    appointment.id,
    'rejected'
  );

  assert.equal(sentEmails[0].subject, 'Your appointment was declined');
  assert.equal(inAppNotifications[0].title, 'Appointment declined');
});

test('institution schedule changes notify the client by email and in-app', async () => {
  const updated = await appointmentService.updateAppointment(
    { id: 10, role: 'institution_admin' },
    appointment.id,
    { appointmentDate: '2026-11-28', appointmentTime: '11:45' }
  );

  assert.equal(updated.appointmentDate, '2026-11-28');
  assert.equal(sentEmails[0].subject, 'Your appointment was rescheduled');
  assert.match(sentEmails[0].text, /2026-11-28/);
  assert.equal(inAppNotifications[0].title, 'Appointment rescheduled');
});

test('disabled client channels suppress appointment alerts', async () => {
  preferences.emailRejected = false;
  preferences.appRejected = false;

  const result = await notificationService.notifyAppointment(appointment.client_id, {
    emailPreference: 'emailRejected',
    appPreference: 'appRejected',
    title: 'Appointment declined',
    message: 'Declined',
    emailMessage: { subject: 'Declined', html: '<p>Declined</p>' },
  });

  assert.deepEqual(result, { appSent: false, emailSent: false });
  assert.equal(sentEmails.length, 0);
  assert.equal(inAppNotifications.length, 0);
});

test('preference changes persist and can disable just the selected channel', async () => {
  const updated = await notificationService.updatePreferences(appointment.client_id, {
    emailApproved: false,
  });

  assert.equal(updated.emailApproved, false);
  assert.equal(updated.appApproved, true);

  const result = await notificationService.notifyAppointment(appointment.client_id, {
    emailPreference: 'emailApproved',
    appPreference: 'appApproved',
    title: 'Appointment approved',
    message: 'Approved',
    emailMessage: { subject: 'Approved', html: '<p>Approved</p>' },
  });

  assert.deepEqual(result, { appSent: true, emailSent: false });
  assert.equal(sentEmails.length, 0);
  assert.equal(inAppNotifications.length, 1);
});

test('client queue position uses the institution queue order', async () => {
  appointment.status = 'approved';
  appointment.queue_number = 3;

  const result = await appointmentService.getQueuePosition(
    appointment.client_id,
    appointment.id
  );

  assert.deepEqual(result, { position: 3 });
});

test('appointment email templates escape user and institution-provided content', () => {
  const email = appointmentNotificationEmail({
    clientName: '<Client>',
    institutionName: '<Clinic>',
    serviceName: 'Consultation',
    appointmentDate: '2026-11-27',
    appointmentTime: '10:30:00',
    event: 'requested',
  });

  assert.match(email.html, /&lt;Client&gt;/);
  assert.match(email.html, /&lt;Clinic&gt;/);
  assert.doesNotMatch(email.html, /<Client>|<Clinic>/);
});
