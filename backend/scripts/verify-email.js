require('dotenv').config();
const { verifyEmailTransport } = require('../src/config/email');

verifyEmailTransport()
  .then(() => {
    console.log('SMTP connection verified.');
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error('SMTP verification failed:', err.message);
    process.exitCode = 1;
  });
