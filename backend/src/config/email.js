const nodemailer = require('nodemailer');

let transporter = null;

function getEmailConfig() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  const port = Number(process.env.SMTP_PORT) || 587;
  const from = process.env.MAIL_FROM || SMTP_USER;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !from) {
    throw new Error('Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be a valid TCP port.');
  }

  return {
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    from: {
      name: process.env.MAIL_FROM_NAME || 'JIPANGE',
      address: from,
    },
  };
}

function getTransporter() {
  if (transporter) return transporter;

  const config = getEmailConfig();
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  return transporter;
}

async function sendEmail({ to, subject, html, text, required = false }) {
  try {
    const config = getEmailConfig();
    if (!to || !subject || !html) {
      throw new Error('Email recipient, subject, and HTML body are required.');
    }

    const info = await getTransporter().sendMail({
      from: config.from,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });
    if (!info.accepted?.length) {
      throw new Error('SMTP server did not accept the email recipient.');
    }
    return info;
  } catch (err) {
    console.error('[email] Delivery failed:', err.message);
    if (required) throw err;
    return false;
  }
}

async function verifyEmailTransport() {
  const transport = getTransporter();
  await transport.verify();
  return true;
}

module.exports = { getTransporter, sendEmail, verifyEmailTransport };
