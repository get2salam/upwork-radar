import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'examples', 'score-leads.mjs');

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

function withTempFile(contents, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'upwork-radar-'));
  const file = join(dir, 'backup.json');
  writeFileSync(file, contents);
  try {
    fn(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('score-leads ranks the bundled sample with no arguments', () => {
  const result = run([]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Upwork Radar — offline scoring preview/);
});

test('score-leads reports a clear error for a missing backup file', () => {
  const result = run(['--file', join(tmpdir(), 'upwork-radar-missing.json')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /file not found/);
});

test('score-leads reports a clear error for malformed JSON', () => {
  withTempFile('{ not valid json', (file) => {
    const result = run(['--file', file]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /not valid JSON/);
  });
});

test('score-leads reports a clear error when the file has no usable items array', () => {
  withTempFile(JSON.stringify({ boardTitle: 'Oops' }), (file) => {
    const result = run(['--file', file]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /must be a JSON array/);
  });
});

test('score-leads ranks a valid exported backup file', () => {
  withTempFile(JSON.stringify({
    items: [{ title: 'A lead', deadline: '2026-08-01', budget: 500, score: 5, winChance: 5, effort: 2, state: 'Seen' }],
  }), (file) => {
    const result = run(['--file', file]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /1 lead ranked/);
  });
});
