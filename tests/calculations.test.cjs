// Optional developer check: node tests/calculations.test.cjs
// Uses only Node's built-in tools. Node is not needed to open the dashboard.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Load the browser scripts without needing a browser or a document object.
const context = vm.createContext({});
for (const file of ['data.js', 'calculations.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
}
const { records } = context.RetailData;
const finance = context.FinanceCalculations;
const originalRecords = JSON.stringify(records);

assert.equal(records.length, 100);
assert.equal(new Set(records.map(row => row.id)).size, 100);
assert.equal(records[0].id, 'FIN-001');
assert.equal(records[99].id, 'FIN-100');
const summary = finance.totals(records);
assert.equal(summary.budget, 7550000);
assert.equal(summary.actual, 7767810);
assert.equal(summary.transactions, 273500);
assert.equal(finance.variance(summary.actual, summary.budget), 217810);

// Known examples and edge cases, independent of the sample data formulas.
assert.equal(finance.variance(110, 100), 10);
assert.equal(finance.variance(90, 100), -10);
assert.equal(finance.variancePercent(110, 100), 10);
assert.equal(finance.variancePercent(90, 100), -10);
assert.equal(finance.variancePercent(0, 0), null);
assert.equal(finance.costPerTransaction(200, 10), 20);
assert.equal(finance.costPerTransaction(200, 0), null);
assert.equal(finance.totals([]).actual, 0);

// Total variance percentage must use total budget, not average row percentages.
const weighted = finance.totals([
  { budget: 100, actual: 110, transactions: 1 },
  { budget: 900, actual: 900, transactions: 9 }
]);
assert.equal(finance.variancePercent(weighted.actual, weighted.budget), 1);
assert.equal(finance.costPerTransaction(weighted.actual, weighted.transactions), 101);

const marchWest = finance.filterRows(records, { month: '2026-03', region: 'West' });
assert.equal(marchWest.length, 5);
assert.equal(finance.filterRows(records, { month: 'missing' }).length, 0);
assert.equal(finance.filterRows(records, { month: 'all' }).length, 100);
assert.equal(finance.sorted(marchWest, 'variance')[0].department, 'Store Operations');
for (const key of ['month', 'department', 'region']) {
  assert.equal(finance.totals(finance.group(records, key)).actual, summary.actual);
}
for (const sort of ['actual', 'variance']) {
  const ordered = finance.sorted(records, sort);
  const metric = row => sort === 'actual' ? row.actual : finance.variance(row.actual, row.budget);
  assert.ok(ordered.every((row, i) => i === 0 || metric(ordered[i - 1]) >= metric(row)));
}

assert.equal(finance.scenario({ actual: 100, budget: 100 }, -5).expense, 95);
assert.equal(finance.scenario(summary, -100).expense, 0);
assert.equal(finance.scenario(summary, 200).expense, summary.actual * 3);
assert.equal(finance.scenario(summary, 0).expense, summary.actual);
for (const invalid of [NaN, Infinity, -101, 201]) {
  assert.equal(finance.validAdjustment(invalid), false);
  assert.equal(finance.scenario(summary, invalid), null);
}
assert.equal(JSON.stringify(records), originalRecords, 'Calculations must not change the data');
console.log('PASS: dataset, totals, ratios, filters, grouping, sorting, scenarios and immutability');
