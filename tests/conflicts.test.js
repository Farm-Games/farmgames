const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.join(ROOT, 'tests', 'fixtures');

const {
  parseConflicts,
  resolveConflict,
  resolveAllConflicts,
  hasRemainingConflicts,
} = require('../editor/lib/conflicts');

const SIMPLE_CONFLICT = `line before
<<<<<<< HEAD
my version of line
=======
their version of line
>>>>>>> abc123
line after`;

const MULTI_CONFLICT = `start
<<<<<<< HEAD
mine first
=======
theirs first
>>>>>>> abc123
middle
<<<<<<< HEAD
mine second
=======
theirs second
>>>>>>> def456
end`;

const MULTILINE_CONFLICT = `<<<<<<< HEAD
line a
line b
line c
=======
line x
line y
>>>>>>> abc123`;

const NO_CONFLICT = `just a normal file
with no conflicts
at all`;

const EMPTY_SIDE_CONFLICT = `<<<<<<< HEAD
=======
their new content
>>>>>>> abc123`;

const FIXTURE_PATH = path.join(FIXTURES_DIR, 'test-conflict.md');

const writeFixture = (content) => {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, content);
};

const readFixture = () => fs.readFileSync(FIXTURE_PATH, 'utf8');

describe('parseConflicts', () => {
  it('parses a single conflict', () => {
    const conflicts = parseConflicts(SIMPLE_CONFLICT);
    assert.strictEqual(conflicts.length, 1);
    assert.strictEqual(conflicts[0].id, 0);
    assert.strictEqual(conflicts[0].mine, 'my version of line');
    assert.strictEqual(conflicts[0].theirs, 'their version of line');
  });

  it('parses multiple conflicts', () => {
    const conflicts = parseConflicts(MULTI_CONFLICT);
    assert.strictEqual(conflicts.length, 2);
    assert.strictEqual(conflicts[0].mine, 'mine first');
    assert.strictEqual(conflicts[0].theirs, 'theirs first');
    assert.strictEqual(conflicts[1].mine, 'mine second');
    assert.strictEqual(conflicts[1].theirs, 'theirs second');
  });

  it('parses multiline conflict content', () => {
    const conflicts = parseConflicts(MULTILINE_CONFLICT);
    assert.strictEqual(conflicts.length, 1);
    assert.strictEqual(conflicts[0].mine, 'line a\nline b\nline c');
    assert.strictEqual(conflicts[0].theirs, 'line x\nline y');
  });

  it('returns empty array for no conflicts', () => {
    const conflicts = parseConflicts(NO_CONFLICT);
    assert.strictEqual(conflicts.length, 0);
  });

  it('handles empty mine side', () => {
    const conflicts = parseConflicts(EMPTY_SIDE_CONFLICT);
    assert.strictEqual(conflicts.length, 1);
    assert.strictEqual(conflicts[0].mine, '');
    assert.strictEqual(conflicts[0].theirs, 'their new content');
  });
});

describe('resolveConflict (single)', () => {
  beforeEach(() => writeFixture(SIMPLE_CONFLICT));
  afterEach(() => {
    if (fs.existsSync(FIXTURE_PATH)) fs.unlinkSync(FIXTURE_PATH);
  });

  it('accepts mine for a single conflict', () => {
    resolveConflict(path.relative(path.resolve(__dirname, '..'), FIXTURE_PATH), 0, 'mine');
    const result = readFixture();
    assert.ok(result.includes('my version of line'));
    assert.ok(!result.includes('their version of line'));
    assert.ok(!result.includes('<<<<<<<'));
    assert.ok(result.includes('line before'));
    assert.ok(result.includes('line after'));
  });

  it('accepts theirs for a single conflict', () => {
    resolveConflict(path.relative(path.resolve(__dirname, '..'), FIXTURE_PATH), 0, 'theirs');
    const result = readFixture();
    assert.ok(result.includes('their version of line'));
    assert.ok(!result.includes('my version of line'));
    assert.ok(!result.includes('<<<<<<<'));
  });
});

describe('resolveConflict (multi)', () => {
  beforeEach(() => writeFixture(MULTI_CONFLICT));
  afterEach(() => {
    if (fs.existsSync(FIXTURE_PATH)) fs.unlinkSync(FIXTURE_PATH);
  });

  it('resolves first conflict while preserving second', () => {
    resolveConflict(path.relative(path.resolve(__dirname, '..'), FIXTURE_PATH), 0, 'mine');
    const result = readFixture();
    assert.ok(result.includes('mine first'));
    assert.ok(!result.includes('theirs first'));
    assert.ok(result.includes('<<<<<<<'), 'second conflict should still exist');
    assert.ok(result.includes('mine second'));
    assert.ok(result.includes('theirs second'));
  });

  it('resolves second conflict while preserving first', () => {
    resolveConflict(path.relative(path.resolve(__dirname, '..'), FIXTURE_PATH), 1, 'theirs');
    const result = readFixture();
    assert.ok(result.includes('<<<<<<<'), 'first conflict should still exist');
    assert.ok(result.includes('theirs second'));
    assert.ok(!result.includes('mine second'));
  });
});

describe('resolveAllConflicts', () => {
  beforeEach(() => writeFixture(MULTI_CONFLICT));
  afterEach(() => {
    if (fs.existsSync(FIXTURE_PATH)) fs.unlinkSync(FIXTURE_PATH);
  });

  it('accepts all mine', () => {
    resolveAllConflicts(path.relative(path.resolve(__dirname, '..'), FIXTURE_PATH), 'mine');
    const result = readFixture();
    assert.ok(result.includes('mine first'));
    assert.ok(result.includes('mine second'));
    assert.ok(!result.includes('theirs first'));
    assert.ok(!result.includes('theirs second'));
    assert.ok(!result.includes('<<<<<<<'));
  });

  it('accepts all theirs', () => {
    resolveAllConflicts(path.relative(path.resolve(__dirname, '..'), FIXTURE_PATH), 'theirs');
    const result = readFixture();
    assert.ok(result.includes('theirs first'));
    assert.ok(result.includes('theirs second'));
    assert.ok(!result.includes('mine first'));
    assert.ok(!result.includes('mine second'));
    assert.ok(!result.includes('<<<<<<<'));
  });

  it('preserves non-conflict content', () => {
    resolveAllConflicts(path.relative(path.resolve(__dirname, '..'), FIXTURE_PATH), 'mine');
    const result = readFixture();
    assert.ok(result.includes('start'));
    assert.ok(result.includes('middle'));
    assert.ok(result.includes('end'));
  });
});

describe('hasRemainingConflicts', () => {
  beforeEach(() => writeFixture(SIMPLE_CONFLICT));
  afterEach(() => {
    if (fs.existsSync(FIXTURE_PATH)) fs.unlinkSync(FIXTURE_PATH);
  });

  it('returns true when conflicts remain', () => {
    const rel = path.relative(path.resolve(__dirname, '..'), FIXTURE_PATH);
    assert.ok(hasRemainingConflicts(rel));
  });

  it('returns false after all conflicts resolved', () => {
    const rel = path.relative(path.resolve(__dirname, '..'), FIXTURE_PATH);
    resolveConflict(rel, 0, 'mine');
    assert.ok(!hasRemainingConflicts(rel));
  });
});
