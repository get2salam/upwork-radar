// Pure scoring and formatting helpers for Upwork Radar leads.
// Kept free of DOM and storage access so they can be unit-tested under
// node:test and shared by the browser entry in ./main.js.

export function safeNumber(value, fallback, min, max) {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

export function safeDeadline(value, fallback) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  const [year, month, day] = value.split('-').map(Number);
  const isRealCalendarDay = date.getFullYear() === year
    && date.getMonth() + 1 === month
    && date.getDate() === day;
  return isRealCalendarDay ? value : fallback;
}

export function todayISO(offset = 0, now = new Date()) {
  // Build the ISO date from local components so users east of UTC do not see
  // the day flip backwards once setHours(0) crosses the UTC midnight line.
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysFromToday(value, now = new Date()) {
  if (!value) return 999;
  if (safeDeadline(value, '') !== value) return 999;
  const today = new Date(`${todayISO(0, now)}T00:00:00`);
  const target = new Date(`${value}T00:00:00`);
  return Math.round((target - today) / 86400000);
}

export function deadlineSortKey(item, now = new Date()) {
  const days = daysFromToday(item.deadline, now);
  return days < 0 ? Number.MAX_SAFE_INTEGER : days;
}

export function cleanFragment(value, fallback) {
  const trimmed = String(value || '').trim().replace(/[\s.,;:!?-]+$/, '');
  return (trimmed || fallback).toLowerCase();
}

export function proposalOpener(item) {
  const deliverable = cleanFragment(item.deliverable, 'the engagement');
  const hook = cleanFragment(item.hook, 'a focused first milestone');
  return `Hi, this looks like a strong fit. I would approach the ${deliverable} by focusing on ${hook} and shipping a clear first milestone quickly.`;
}

export function priority(item, now = new Date()) {
  const days = daysFromToday(item.deadline, now);
  const deadlineBoost = days < 0 ? 0 : Math.max(0, 4 - days) * 5;
  const stateBoost = item.state === 'Applying' ? 10 : item.state === 'Shortlisted' ? 6 : item.state === 'Seen' ? 2 : -12;
  const budgetBoost = Math.min(Math.round(item.budget / 250), 40);
  return item.score * 6 + item.winChance * 5 + budgetBoost + deadlineBoost + stateBoost - item.effort * 4;
}

export function toneForDeadline(item, now = new Date()) {
  const days = daysFromToday(item.deadline, now);
  if (days <= 1) return 'danger';
  if (days <= 3) return 'warn';
  return 'success';
}
