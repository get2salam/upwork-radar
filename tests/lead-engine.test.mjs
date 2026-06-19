import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanFragment,
  daysFromToday,
  deadlineSortKey,
  priority,
  proposalOpener,
  rankLeads,
  safeDeadline,
  safeNumber,
  todayISO,
  toneForDeadline,
} from '../js/lead-engine.js';

const NOW = new Date('2026-06-10T12:00:00Z');

function makeItem(overrides = {}) {
  return {
    title: 'Test lead',
    category: 'AI',
    state: 'Shortlisted',
    score: 7,
    effort: 3,
    winChance: 6,
    budget: 1500,
    deadline: '2026-06-15',
    deliverable: 'A scoped prototype',
    hook: 'Reliability and a sharp first milestone',
    note: 'Notes',
    ...overrides,
  };
}

test('safeNumber clamps within bounds and falls back on garbage', () => {
  assert.equal(safeNumber('5', 0, 1, 10), 5);
  assert.equal(safeNumber(99, 0, 1, 10), 10);
  assert.equal(safeNumber(-3, 0, 1, 10), 1);
  assert.equal(safeNumber('not a number', 4, 1, 10), 4);
  assert.equal(safeNumber(null, 4, 1, 10), 4);
  assert.equal(safeNumber('', 4, 1, 10), 4);
  assert.equal(safeNumber(Number.POSITIVE_INFINITY, 4, 1, 10), 4);
});

test('safeDeadline accepts ISO dates and rejects everything else', () => {
  assert.equal(safeDeadline('2026-06-15', '2026-01-01'), '2026-06-15');
  assert.equal(safeDeadline('not-a-date', '2026-01-01'), '2026-01-01');
  assert.equal(safeDeadline('2026/06/15', '2026-01-01'), '2026-01-01');
  assert.equal(safeDeadline('2026-13-40', '2026-01-01'), '2026-01-01');
  assert.equal(safeDeadline('2026-02-31', '2026-01-01'), '2026-01-01');
  assert.equal(safeDeadline('2025-02-29', '2026-01-01'), '2026-01-01');
  assert.equal(safeDeadline('2024-02-29', '2026-01-01'), '2024-02-29');
  assert.equal(safeDeadline(undefined, '2026-01-01'), '2026-01-01');
  assert.equal(safeDeadline(42, '2026-01-01'), '2026-01-01');
});

test('todayISO honours offsets and stays stable across timezone drift', () => {
  assert.equal(todayISO(0, NOW), '2026-06-10');
  assert.equal(todayISO(3, NOW), '2026-06-13');
  assert.equal(todayISO(-5, NOW), '2026-06-05');
});

test('daysFromToday measures whole-day deltas around the fixed now', () => {
  assert.equal(daysFromToday('2026-06-10', NOW), 0);
  assert.equal(daysFromToday('2026-06-11', NOW), 1);
  assert.equal(daysFromToday('2026-06-08', NOW), -2);
  assert.equal(daysFromToday('', NOW), 999);
  assert.equal(daysFromToday(undefined, NOW), 999);
});

test('daysFromToday treats impossible calendar dates as unscheduled', () => {
  assert.equal(daysFromToday('2026-02-31', NOW), 999);
  assert.equal(daysFromToday('2025-02-29', NOW), 999);
});

test('deadlineSortKey pushes overdue items to the back of the queue', () => {
  const upcoming = deadlineSortKey({ deadline: '2026-06-15' }, NOW);
  const overdue = deadlineSortKey({ deadline: '2026-05-01' }, NOW);
  assert.equal(upcoming, 5);
  assert.equal(overdue, Number.MAX_SAFE_INTEGER);
  assert.ok(overdue > upcoming, 'overdue items must sort after live ones');
});

test('toneForDeadline escalates as the date gets closer', () => {
  assert.equal(toneForDeadline({ deadline: '2026-06-10' }, NOW), 'danger');
  assert.equal(toneForDeadline({ deadline: '2026-06-11' }, NOW), 'danger');
  assert.equal(toneForDeadline({ deadline: '2026-06-12' }, NOW), 'warn');
  assert.equal(toneForDeadline({ deadline: '2026-06-13' }, NOW), 'warn');
  assert.equal(toneForDeadline({ deadline: '2026-06-20' }, NOW), 'success');
});

test('cleanFragment trims trailing punctuation and lowercases', () => {
  assert.equal(cleanFragment('Build the thing!!!', 'fallback'), 'build the thing');
  assert.equal(cleanFragment('   Spaced  text. ', 'fallback'), 'spaced  text');
  assert.equal(cleanFragment('', 'Fallback Phrase'), 'fallback phrase');
  assert.equal(cleanFragment(null, 'Fallback Phrase'), 'fallback phrase');
  assert.equal(cleanFragment('   ', 'Fallback Phrase'), 'fallback phrase');
});

test('proposalOpener stitches deliverable and hook into a clean sentence', () => {
  const opener = proposalOpener({
    deliverable: 'Clickable prototype.',
    hook: 'Domain depth and rapid iteration.',
  });
  assert.match(opener, /^Hi, this looks like a strong fit\./);
  assert.match(opener, /approach the clickable prototype/);
  assert.match(opener, /focusing on domain depth and rapid iteration/);
  assert.ok(!opener.includes('..'), 'opener should not double-punctuate');
});

test('proposalOpener uses fallbacks when fields are empty', () => {
  const opener = proposalOpener({ deliverable: '', hook: '' });
  assert.match(opener, /approach the the engagement/);
  assert.match(opener, /focusing on a focused first milestone/);
});

test('priority rewards strong applying leads more than weak passed leads', () => {
  const strong = priority(makeItem({ state: 'Applying', score: 9, winChance: 8, budget: 4000, effort: 3, deadline: '2026-06-12' }), NOW);
  const weak = priority(makeItem({ state: 'Passed', score: 3, winChance: 2, budget: 200, effort: 6, deadline: '2026-06-30' }), NOW);
  assert.ok(strong > weak, `expected strong (${strong}) to beat weak (${weak})`);
});

test('priority gives a deadline boost only inside the 4-day window', () => {
  const today = priority(makeItem({ deadline: '2026-06-10' }), NOW);
  const tomorrow = priority(makeItem({ deadline: '2026-06-11' }), NOW);
  const far = priority(makeItem({ deadline: '2026-06-30' }), NOW);
  assert.ok(today > tomorrow, 'same-day deadline should outrank next-day');
  assert.ok(tomorrow > far, 'near deadline should outrank distant one');
});

test('priority caps the budget contribution so a single huge lead cannot dominate', () => {
  const capped = priority(makeItem({ budget: 10_000 }), NOW);
  const ridiculous = priority(makeItem({ budget: 10_000_000 }), NOW);
  assert.equal(capped, ridiculous, 'budget boost must saturate at the cap');
});

test('priority matches the documented formula exactly for a known input', () => {
  const item = makeItem({
    state: 'Applying',
    score: 9,
    winChance: 8,
    budget: 3200,
    effort: 4,
    deadline: '2026-06-12',
  });
  // score 9*6 + winChance 8*5 + budgetBoost min(round(3200/250),40)=13
  //   + deadlineBoost max(0, 4-2)*5 = 10
  //   + stateBoost Applying = 10
  //   - effort 4*4 = 16
  // = 54 + 40 + 13 + 10 + 10 - 16 = 111
  assert.equal(priority(item, NOW), 111);
});

test('rankLeads orders by priority without mutating the source list', () => {
  const weak = makeItem({ title: 'Weak passed lead', state: 'Passed', score: 3, winChance: 2, budget: 200, effort: 6, deadline: '2026-06-30' });
  const urgent = makeItem({ title: 'Urgent strong lead', state: 'Applying', score: 9, winChance: 8, budget: 4000, effort: 3, deadline: '2026-06-11' });
  const steady = makeItem({ title: 'Steady shortlist', state: 'Shortlisted', score: 7, winChance: 6, budget: 1500, effort: 3, deadline: '2026-06-15' });
  const source = [weak, steady, urgent];

  assert.deepEqual(rankLeads(source, { now: NOW }).map((item) => item.title), [
    'Urgent strong lead',
    'Steady shortlist',
    'Weak passed lead',
  ]);
  assert.deepEqual(source.map((item) => item.title), [
    'Weak passed lead',
    'Steady shortlist',
    'Urgent strong lead',
  ]);
});

test('rankLeads can prioritize the deadline queue while pushing bad dates last', () => {
  const invalid = makeItem({ title: 'Broken deadline', deadline: '2026-02-31', state: 'Applying', score: 10, winChance: 10 });
  const later = makeItem({ title: 'Later live lead', deadline: '2026-06-14', score: 8 });
  const sooner = makeItem({ title: 'Sooner live lead', deadline: '2026-06-11', score: 6 });

  assert.deepEqual(rankLeads([invalid, later, sooner], { mode: 'deadline', now: NOW }).map((item) => item.title), [
    'Sooner live lead',
    'Later live lead',
    'Broken deadline',
  ]);
});
