// Calendar-date helpers. Appointment dates are plain calendar days
// ('YYYY-MM-DD'), not instants, so they must never be shifted by the
// server's or database session's timezone.
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Nairobi';

/** Today's date as 'YYYY-MM-DD' in the app's timezone (not UTC). */
function todayLocal() {
  // The 'en-CA' locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(new Date());
}

module.exports = { APP_TIMEZONE, todayLocal };
