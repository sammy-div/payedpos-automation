const test = require('node:test');
const assert = require('node:assert/strict');
const SnapshotComparison = require('../src/snapshots/snapshot-comparison');

test('compare(): correctly infers "Transaction ID" as the key field (previously only worked for a hardcoded whitelist that did not include it)', () => {
  const before = {
    rows: [
      { 'Transaction ID': 'TXN-1', Amount: '12.50' },
      { 'Transaction ID': 'TXN-2', Amount: '8.00' },
    ],
  };
  const after = {
    rows: [
      { 'Transaction ID': 'TXN-1', Amount: '15.00' },
      { 'Transaction ID': 'TXN-3', Amount: '20.00' },
    ],
  };

  const result = SnapshotComparison.compare(before, after);

  assert.equal(result.keyField, 'Transaction ID');
  // Identity-based comparison: TXN-2 removed, TXN-3 added, TXN-1 modified.
  // A positional fallback (the old, wrong behavior) would instead report
  // TXN-2 -> TXN-3 as a single "modified" row and miss the add/remove.
  assert.equal(result.totals.added, 1);
  assert.equal(result.totals.removed, 1);
  assert.equal(result.totals.modified, 1);
  assert.deepEqual(result.added, [{ 'Transaction ID': 'TXN-3', Amount: '20.00' }]);
  assert.deepEqual(result.removed, [{ 'Transaction ID': 'TXN-2', Amount: '8.00' }]);
});

test('inferKeyField pattern matches realistic identifier field names', () => {
  const shouldMatch = [
    'ID',
    'Id',
    'id',
    'Terminal ID',
    'Transaction ID',
    'merchant_id',
    'merchant-id',
    'transactionId',
    'merchantId',
    'terminalID',
  ];

  for (const key of shouldMatch) {
    const result = SnapshotComparison.compare({ rows: [{ [key]: 'a' }] }, { rows: [{ [key]: 'a' }] });
    assert.equal(result.keyField, key, `expected "${key}" to be detected as a key field`);
  }
});

test('inferKeyField pattern does not false-positive on common words merely ending in "id"', () => {
  const shouldNotMatch = ['Paid', 'Void', 'Grid', 'Valid', 'Invalid', 'Solid', 'Avoid', 'Kid', 'Squid'];

  for (const key of shouldNotMatch) {
    const result = SnapshotComparison.compare({ rows: [{ [key]: 'a', Name: 'x' }] }, { rows: [{ [key]: 'a', Name: 'x' }] });
    assert.notEqual(result.keyField, key, `"${key}" should not be mistaken for an identifier field`);
  }
});

test('compare(): falls back to positional comparison when no identifier-like field exists', () => {
  const before = { rows: [{ Name: 'Alpha', Status: 'Active' }] };
  const after = { rows: [{ Name: 'Alpha', Status: 'Inactive' }] };

  const result = SnapshotComparison.compare(before, after);

  assert.equal(result.keyField, null);
  assert.equal(result.totals.modified, 1);
});

test('generateReport(): produces a readable summary from a comparison result', () => {
  const comparison = SnapshotComparison.compare(
    { rows: [{ ID: '1', Name: 'Alpha' }] },
    { rows: [{ ID: '1', Name: 'Beta' }, { ID: '2', Name: 'Gamma' }] }
  );

  const report = SnapshotComparison.generateReport(comparison);

  assert.match(report.summary, /key field: ID/);
  assert.equal(report.totals.added, 1);
  assert.equal(report.totals.modified, 1);
});
