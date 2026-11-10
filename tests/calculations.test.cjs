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
assert.ok(Math.abs(finance.variancePercent(summary.actual, summary.budget) - 2.8849006622516558) < 1e-12,
  'Full-dataset variance percentage must use total variance / total budget');
assert.ok(Math.abs(finance.costPerTransaction(summary.actual, summary.transactions) - 28.401499085923216) < 1e-12);

// Known examples and edge cases, independent of the sample data formulas.
assert.equal(finance.variance(110, 100), 10);
assert.equal(finance.variance(90, 100), -10);
assert.equal(finance.variancePercent(110, 100), 10);
assert.equal(finance.variancePercent(90, 100), -10);
assert.equal(finance.variancePercent(0, 0), null);
assert.equal(finance.variancePercent(100, 0), null);
assert.equal(finance.variancePercent(100, 100), 0);
assert.equal(finance.costPerTransaction(200, 10), 20);
assert.equal(finance.costPerTransaction(200, 0), null);
assert.equal(finance.totals([]).actual, 0);
const empty = finance.totals([]);
assert.equal(empty.budget, 0);
assert.equal(empty.transactions, 0);
assert.equal(finance.variancePercent(empty.actual, empty.budget), null);
assert.equal(finance.costPerTransaction(empty.actual, empty.transactions), null);
assert.equal(finance.group([], 'department').length, 0);
assert.equal(finance.sorted([], 'variance').length, 0);

// Total variance percentage must use total budget, not average row percentages.
const weighted = finance.totals([
  { budget: 100, actual: 110, transactions: 1 },
  { budget: 900, actual: 900, transactions: 9 }
]);
assert.equal(finance.variancePercent(weighted.actual, weighted.budget), 1);
assert.equal(finance.costPerTransaction(weighted.actual, weighted.transactions), 101);
// Unequal transaction counts must also be weighted, not averaged per row.
const unequalCounts = finance.totals([
  { budget: 100, actual: 100, transactions: 1 },
  { budget: 900, actual: 900, transactions: 99 }
]);
assert.equal(finance.costPerTransaction(unequalCounts.actual, unequalCounts.transactions), 10);

const marchWest = finance.filterRows(records, { month: '2026-03', region: 'West' });
assert.equal(marchWest.length, 5);
assert.equal(marchWest.map(row => row.id).join(','), 'FIN-044,FIN-048,FIN-052,FIN-056,FIN-060');
assert.ok(marchWest.every(row => row.month === '2026-03' && row.region === 'West'));
const marchWestMarketing = finance.filterRows(records, {
  month: '2026-03', region: 'West', department: 'Marketing'
});
assert.equal(marchWestMarketing.length, 1, 'All three filters must apply together');
assert.equal(marchWestMarketing[0].id, 'FIN-052');
assert.equal(marchWestMarketing[0].budget, 60200);
assert.equal(marchWestMarketing[0].actual, 69049);
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
const summaryBefore = JSON.stringify(summary);
const reduction = finance.scenario(summary, -5);
assert.equal(reduction.expense, 7379419.5, '5% reduction must apply to recorded actual');
assert.equal(reduction.variance, -170580.5);
assert.equal(reduction.change, -388390.5);
assert.equal(JSON.stringify(summary), summaryBefore, 'Scenario must not overwrite input totals');
assert.equal(finance.scenario(summary, -5).expense, 7379419.5, 'Repeated scenarios must not compound');
assert.equal(finance.scenario(summary, -100).expense, 0);
assert.equal(finance.scenario(summary, 200).expense, summary.actual * 3);
assert.equal(finance.scenario(summary, 0).expense, summary.actual);
const frozenSummary = Object.freeze({ actual: 200, budget: 180, transactions: 10 });
assert.equal(finance.scenario(frozenSummary, -10).expense, 180);
assert.equal(frozenSummary.actual, 200);
assert.equal(finance.scenario(frozenSummary, 20).expense, 240);
assert.equal(frozenSummary.actual, 200);
for (const invalid of [NaN, Infinity, -101, 201]) {
  assert.equal(finance.validAdjustment(invalid), false);
  assert.equal(finance.scenario(summary, invalid), null);
}
assert.equal(JSON.stringify(records), originalRecords, 'Calculations must not change the data');
console.log('PASS: dataset, totals, ratios, filters, grouping, sorting, scenarios and immutability');
