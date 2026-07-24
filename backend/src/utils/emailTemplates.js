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

function welcomeEmail(fullName) {
  return {
    subject: 'Welcome to JIPANGE',
    html: baseLayout(`
      <p>Hi ${fullName},</p>
      <p>Your JIPANGE account has been created successfully. You can now book appointments and manage your visits online.</p>
    `),
  };
}

function passwordResetEmail(fullName, resetUrl) {
  return {
    subject: 'Reset your JIPANGE password',
    html: baseLayout(`
      <p>Hi ${fullName},</p>
      <p>We received a request to reset your password. This link expires in 1 hour.</p>
      <p>
        <a href="${resetUrl}" style="background: #00A86B; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none;">
          Reset Password
        </a>
      </p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `),
  };
}

function staffCredentialsEmail(fullName, institutionName, email) {
  return {
    subject: `Your JIPANGE account for ${institutionName}`,
    html: baseLayout(`
      <p>Hi ${fullName},</p>
      <p>${institutionName} has added you as a staff member on JIPANGE. Your Institution Admin has set up your account — sign in with the email and password they gave you at:</p>
      <p><strong>${email}</strong></p>
      <p>You can change your password after logging in from your Profile page.</p>
    `),
  };
}

module.exports = { welcomeEmail, passwordResetEmail, staffCredentialsEmail };
