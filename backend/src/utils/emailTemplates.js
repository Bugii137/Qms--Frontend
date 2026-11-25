function baseLayout(bodyHtml) {
  return `
    <div style="font-family: Poppins, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1E3A8A;">JIPANGE</h2>
      ${bodyHtml}
      <p style="color: #888; font-size: 12px; margin-top: 32px;">
        Plan it. Show up. Get served.
      </p>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function welcomeEmail(fullName, loginUrl) {
  return {
    subject: 'Welcome to JIPANGE',
    html: baseLayout(`
      <p>Hi ${escapeHtml(fullName)},</p>
      <p>Your JIPANGE account has been created successfully. You can now book appointments and manage your visits online.</p>
      ${loginUrl ? `<p><a href="${escapeHtml(loginUrl)}">Sign in to JIPANGE</a></p>` : ''}
    `),
    text: `Hi ${fullName},\n\nYour JIPANGE account has been created successfully. You can now book appointments and manage your visits online.${loginUrl ? `\n\nSign in: ${loginUrl}` : ''}\n\nPlan it. Show up. Get served.`,
  };
}

function institutionApplicationEmail(fullName, institutionName) {
  return {
    subject: 'Institution application received',
    html: baseLayout(`
      <p>Hi ${escapeHtml(fullName)},</p>
      <p>We received the application for ${escapeHtml(institutionName)}. A super administrator will review it and you will be notified when its status changes.</p>
    `),
    text: `Hi ${fullName},\n\nWe received the application for ${institutionName}. A super administrator will review it and you will be notified when its status changes.\n\nPlan it. Show up. Get served.`,
  };
}

function institutionStatusEmail(fullName, institutionName, status) {
  const approved = status === 'active';
  const statusText = status === 'active'
    ? 'approved'
    : status === 'pending'
      ? 'pending review'
      : 'suspended';
  return {
    subject: approved
      ? 'Your institution application was approved'
      : status === 'pending'
        ? 'Your institution application is pending'
        : 'Your institution access was suspended',
    html: baseLayout(`
      <p>Hi ${escapeHtml(fullName)},</p>
      <p>The status of ${escapeHtml(institutionName)} has changed to ${statusText}.</p>
      ${approved ? '<p>You can now sign in and start setting up your institution.</p>' : '<p>Please contact support if you believe this was a mistake.</p>'}
    `),
    text: `Hi ${fullName},\n\nThe status of ${institutionName} has changed to ${statusText}.${approved ? '\n\nYou can now sign in and start setting up your institution.' : '\n\nPlease contact support if you believe this was a mistake.'}\n\nPlan it. Show up. Get served.`,
  };
}

function maintenanceEmail(maintenanceMessage) {
  return {
    subject: 'JIPANGE system maintenance',
    html: baseLayout(`
      <p>JIPANGE is entering maintenance mode.</p>
      <p>${escapeHtml(maintenanceMessage).replace(/\r?\n/g, '<br>')}</p>
      <p>We will restore access when maintenance is complete.</p>
    `),
    text: `JIPANGE is entering maintenance mode.\n\n${maintenanceMessage}\n\nWe will restore access when maintenance is complete.`,
  };
}

function passwordResetEmail(fullName, resetUrl) {
  return {
    subject: 'Reset your JIPANGE password',
    html: baseLayout(`
      <p>Hi ${escapeHtml(fullName)},</p>
      <p>We received a request to reset your password. This link expires in 1 hour.</p>
      <p>
        <a href="${escapeHtml(resetUrl)}" style="background: #00A86B; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none;">
          Reset Password
        </a>
      </p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `),
    text: `Hi ${fullName},\n\nWe received a request to reset your password. Use this link within 1 hour:\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  };
}

function profileUpdatedEmail(fullName, changedFields) {
  const fields = changedFields.join(', ');
  return {
    subject: 'Your JIPANGE profile was updated',
    html: baseLayout(`
      <p>Hi ${escapeHtml(fullName)},</p>
      <p>The following details on your JIPANGE profile were updated: <strong>${escapeHtml(fields)}</strong>.</p>
      <p>If you did not make this change, please reset your password and contact support.</p>
    `),
    text: `Hi ${fullName},\n\nThe following details on your JIPANGE profile were updated: ${fields}.\n\nIf you did not make this change, please reset your password and contact support.`,
  };
}

function passwordChangedEmail(fullName) {
  return {
    subject: 'Your JIPANGE password was changed',
    html: baseLayout(`
      <p>Hi ${escapeHtml(fullName)},</p>
      <p>Your JIPANGE password was changed successfully.</p>
      <p>If you did not make this change, reset your password immediately and contact support.</p>
    `),
    text: `Hi ${fullName},\n\nYour JIPANGE password was changed successfully.\n\nIf you did not make this change, reset your password immediately and contact support.`,
  };
}

function staffCredentialsEmail(fullName, institutionName, email) {
  return {
    subject: `Your JIPANGE account for ${String(institutionName).replace(/[\r\n]/g, ' ')}`,
    html: baseLayout(`
      <p>Hi ${escapeHtml(fullName)},</p>
      <p>${escapeHtml(institutionName)} has added you as a staff member on JIPANGE. Your Institution Admin has set up your account — sign in with the email and password they gave you at:</p>
      <p><strong>${escapeHtml(email)}</strong></p>
      <p>You can change your password after logging in from your Profile page.</p>
    `),
    text: `Hi ${fullName},\n\n${institutionName} has added you as a staff member on JIPANGE. Sign in with your email (${email}) and the password provided by your Institution Admin.\n\nYou can change your password after logging in from your Profile page.`,
  };
}

function appointmentNotificationEmail({
  clientName,
  institutionName,
  serviceName,
  appointmentDate,
  appointmentTime,
  event,
  ticketNumber,
}) {
  const eventDetails = {
    requested: {
      subject: 'Booking request received',
      headline: 'Your booking request was received',
      description: 'Your appointment request is awaiting approval from the institution.',
    },
    approved: {
      subject: 'Your appointment was approved',
      headline: 'Your appointment was approved',
      description: 'The institution approved your appointment.',
    },
    rejected: {
      subject: 'Your appointment was declined',
      headline: 'Your appointment was declined',
      description: 'The institution declined your appointment. Contact the institution if you need more information.',
    },
    rescheduled: {
      subject: 'Your appointment was rescheduled',
      headline: 'Your appointment was rescheduled',
      description: 'The date or time of your appointment was updated.',
    },
    follow_up: {
      subject: 'A follow-up appointment was scheduled',
      headline: 'A follow-up appointment was scheduled',
      description: 'The institution scheduled a follow-up appointment for you. Review its date and time, and wait for approval.',
    },
    cancelled: {
      subject: 'Your appointment was cancelled',
      headline: 'Your appointment was cancelled',
      description: 'Your appointment has been cancelled.',
    },
    completed: {
      subject: 'Your appointment is complete',
      headline: 'Your appointment is complete',
      description: 'Your appointment has been marked as complete.',
    },
  };
  const details = eventDetails[event];
  if (!details) throw new Error(`Unsupported appointment notification event: ${event}`);

  const date = appointmentDate instanceof Date
    ? appointmentDate.toISOString().slice(0, 10)
    : String(appointmentDate).slice(0, 10);
  const time = String(appointmentTime).slice(0, 5);
  const ticket = event === 'approved' && ticketNumber
    ? `<p>Ticket number: <strong>${escapeHtml(ticketNumber)}</strong></p>`
    : '';
  const textTicket = event === 'approved' && ticketNumber
    ? `\nTicket number: ${ticketNumber}`
    : '';

  return {
    subject: details.subject,
    html: baseLayout(`
      <p>Hi ${escapeHtml(clientName)},</p>
      <h3>${escapeHtml(details.headline)}</h3>
      <p>${escapeHtml(details.description)}</p>
      <p><strong>${escapeHtml(serviceName)}</strong> at <strong>${escapeHtml(institutionName)}</strong></p>
      <p>Date: ${escapeHtml(date)}<br>Time: ${escapeHtml(time)}</p>
      ${ticket}
    `),
    text: `Hi ${clientName},\n\n${details.headline}\n${details.description}\n\n${serviceName} at ${institutionName}\nDate: ${date}\nTime: ${time}${textTicket}\n\nPlan it. Show up. Get served.`,
  };
}

module.exports = {
  welcomeEmail,
  institutionApplicationEmail,
  institutionStatusEmail,
  maintenanceEmail,
  passwordResetEmail,
  profileUpdatedEmail,
  passwordChangedEmail,
  staffCredentialsEmail,
  appointmentNotificationEmail,
};
