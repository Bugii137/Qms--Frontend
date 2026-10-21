// Calendar-date helpers. Appointment dates are plain 'YYYY-MM-DD' days.
// Never use new Date().toISOString().slice(0, 10) for "today": that is the
// UTC date, which is the wrong day for part of every day outside UTC.

const pad = (n) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' for a Date, in the browser's local timezone. */
export const toLocalYMD = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Today's local date as 'YYYY-MM-DD'. */
export const todayLocal = () => toLocalYMD(new Date())

/** Normalise an API date ('2026-10-22' or an ISO string) to 'YYYY-MM-DD'. */
export const ymd = (value) => (value ? String(value).slice(0, 10) : '')

/** Parse a 'YYYY-MM-DD' day as local midnight (avoids the UTC-midnight shift). */
export const parseYMD = (value) => new Date(`${ymd(value)}T00:00:00`)
