const { timezone } = require('../config/env');

// Offset in minutes of `tz` at the given instant, e.g. +480 for Asia/Manila
function tzOffsetMinutes(date, tz = timezone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName').value; // "GMT+08:00" or "GMT"
  const m = parts.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] || 0));
}

// "YYYY-MM-DD" of the clinic's local calendar day
function localDateKey(date = new Date(), tz = timezone) {
  return date.toLocaleDateString('en-CA', { timeZone: tz });
}

// Start/end (as UTC Date objects) of the clinic's local day containing `date`
function dayRange(date = new Date(), tz = timezone) {
  const key = localDateKey(date, tz);
  const offset = tzOffsetMinutes(date, tz);
  const start = new Date(Date.parse(`${key}T00:00:00Z`) - offset * 60000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, key };
}

// Parse a "YYYY-MM-DD" from a query string into the start of that local day
function parseLocalDate(str, tz = timezone) {
  if (!str) return undefined;
  const d = new Date(`${str}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return dayRange(d, tz).start;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

module.exports = { localDateKey, dayRange, parseLocalDate, addDays };
