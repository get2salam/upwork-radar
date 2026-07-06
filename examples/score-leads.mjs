// Offline scoring preview — rank and display leads without opening a browser.
//
// Usage:
//   node examples/score-leads.mjs
//   node examples/score-leads.mjs --file my-backup.json

import { readFileSync } from 'node:fs';
import { daysFromToday, priority, rankLeads } from '../js/lead-engine.js';

const SAMPLE = [
  {
    title: 'Legal AI prototype request',
    category: 'AI',
    state: 'Shortlisted',
    score: 9,
    effort: 4,
    winChance: 8,
    budget: 3200,
    deadline: '2026-07-10',
    deliverable: 'Clickable prototype and scoped technical plan',
    hook: 'Lead with domain overlap and rapid prototype discipline.',
  },
  {
    title: 'Large scraping rebuild',
    category: 'Scraping',
    state: 'Applying',
    score: 8,
    effort: 5,
    winChance: 7,
    budget: 4800,
    deadline: '2026-07-07',
    deliverable: 'Stable scraper rebuild with retry and audit flow',
    hook: 'Stress reliability, observability, and data recovery.',
  },
  {
    title: 'Content SEO audit',
    category: 'Content',
    state: 'Seen',
    score: 5,
    effort: 2,
    winChance: 5,
    budget: 900,
    deadline: '2026-07-20',
    deliverable: 'Audit report and keyword map',
    hook: 'Concrete deliverable, low competition.',
  },
  {
    title: 'Small browser automation fix',
    category: 'Automation',
    state: 'Passed',
    score: 4,
    effort: 1,
    winChance: 3,
    budget: 250,
    deadline: '2026-07-05',
    deliverable: 'One small browser workflow patch',
    hook: 'Quick fix, but low leverage and weak signal.',
  },
];

function fail(message) {
  console.error(`score-leads: ${message}`);
  process.exit(1);
}

function loadLeads() {
  const flagIndex = process.argv.indexOf('--file');
  if (flagIndex === -1 || !process.argv[flagIndex + 1]) return SAMPLE;
  const filePath = process.argv[flagIndex + 1];

  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (err) {
    return fail(`could not read "${filePath}" (${err.code === 'ENOENT' ? 'file not found' : err.message}).`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail(`"${filePath}" is not valid JSON.`);
  }

  const items = Array.isArray(parsed) ? parsed : parsed?.items;
  if (!Array.isArray(items)) {
    return fail(`"${filePath}" must be a JSON array of leads or an object with an "items" array.`);
  }
  return items;
}

function fmtBudget(n) {
  return `$${Number(n ?? 0).toLocaleString('en-US')}`;
}

function fmtDays(deadline) {
  const d = daysFromToday(deadline);
  if (d === 999) return '—';
  if (d < 0) return `${Math.abs(d)}d ago`;
  if (d === 0) return 'today';
  return `in ${d}d`;
}

const leads = loadLeads();
const ranked = rankLeads(leads);
const W = 94;

console.log('\nUpwork Radar — offline scoring preview');
console.log('─'.repeat(W));
console.log(
  '  #   ' +
  'Title'.padEnd(38) +
  'Pri  ' +
  'Budget'.padEnd(10) +
  'Deadline    ' +
  'Timing    ' +
  'State',
);
console.log('─'.repeat(W));
ranked.forEach((item, i) => {
  const rank  = String(i + 1).padStart(2);
  const title = (item.title ?? '').slice(0, 37).padEnd(38);
  const pri   = String(priority(item)).padStart(3);
  const bud   = fmtBudget(item.budget).padEnd(10);
  const dl    = (item.deadline ?? 'none  ').padEnd(12);
  const days  = fmtDays(item.deadline).padEnd(10);
  const state = item.state ?? '';
  console.log(`  ${rank}.  ${title}${pri}  ${bud}${dl}${days}${state}`);
});
console.log('─'.repeat(W));
console.log(`  ${ranked.length} lead${ranked.length !== 1 ? 's' : ''} ranked.`);
console.log('  Verify the engine: node --test tests/lead-engine.test.mjs\n');
