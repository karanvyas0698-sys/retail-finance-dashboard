// node tests/rendering.test.cjs
// Small simulated page: checks financial text and events, not browser layout.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Blob } = require('node:buffer');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function loadApp(testRecords) {
  const elements = {};
  const downloads = {};
  function makeElement(id = '') {
    return {
      value: id === 'adjustment' ? '0' : id === 'sort' ? 'id' : '',
      innerHTML: '', textContent: '', children: [], events: {},
      get valueAsNumber() { return this.value === '' ? NaN : Number(this.value); },
      appendChild(child) {
        this.children.push(child);
        if (this.children.length === 1 && ['month', 'department', 'region'].includes(id)) {
          this.value = child.value;
        }
      },
      addEventListener(event, handler) { this.events[event] = handler; },
      click() { downloads.filename = this.download; },
      remove() {}
    };
  }
  const context = vm.createContext({
    document: {
      getElementById(id) { return elements[id] ??= makeElement(id); },
      createElement() { return makeElement(); }, body: makeElement()
    },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    Blob,
    URL: { createObjectURL(blob) { downloads.blob = blob; return 'blob:test'; }, revokeObjectURL() {} },
    setTimeout(callback) { callback(); }
  });
  vm.runInContext(read('data.js'), context);
  // Fixtures exist only in this isolated test context, never in data.js.
  if (testRecords) context.RetailData.records = testRecords;
  vm.runInContext(read('calculations.js'), context);
  vm.runInContext(read('app.js'), context);
  return { elements, context, downloads };
}

async function run() {
  const app = loadApp();
  const { elements, context } = app;
  const before = JSON.stringify(context.RetailData.records);
  assert.ok(elements.cards.innerHTML.includes('$217,810'));
  assert.ok(elements.cards.innerHTML.includes('2.9% · Unfavorable'));
  assert.equal(elements.activeFilters.textContent, 'Month: All · Department: All · Region: All');
  assert.ok(elements.departmentChart.innerHTML.includes('Unfavorable'));
  assert.ok(elements.departmentChart.innerHTML.includes('Favorable'));
  assert.ok(elements.monthChart.innerHTML.includes('Unfavorable'));
  assert.ok(elements.rows.innerHTML.includes('Favorable'));
  elements.sort.value = 'variance';
  elements.sort.events.change();
  assert.ok(elements.sortStatus.textContent.includes('Expense variance (highest first)'));
  for (const value of ['-5', '-100', '200', '0']) {
    elements.adjustment.value = value;
    elements.adjustment.events.input();
    elements.saveScenario.events.click();
    assert.ok(elements.scenarioResult.textContent.includes('Recorded actual: $7,767,810 (unchanged)'));
    assert.equal(JSON.stringify(context.RetailData.records), before);
  }
  elements.department.value = 'Administration';
  elements.department.events.change();
  assert.ok(elements.activeFilters.textContent.includes('Department: Administration'));
  assert.ok(elements.cards.innerHTML.includes('Favorable'));

  // Force a filter with no matches; the actual sample grid has every combination.
  elements.month.value = 'no-match';
  elements.month.events.change();
  assert.ok(elements.cards.innerHTML.includes('N/A'));
  assert.ok(elements.cards.innerHTML.includes('No summaries selected'));
  assert.ok(!elements.cards.innerHTML.includes('On budget'));
  assert.ok(elements.insight.textContent.includes('No department'));
  assert.ok(elements.rows.innerHTML.includes('No summaries'));
  assert.ok(elements.departmentChart.textContent.includes('No summaries'));
  assert.ok(elements.monthChart.textContent.includes('No summaries'));
  assert.ok(elements.scenarioResult.textContent.includes('no scenario'));
  elements.export.events.click();
  assert.equal((await app.downloads.blob.text()).split('\r\n').length, 1);
  elements.reset.events.click();
  assert.ok(elements.count.textContent.startsWith('100 of 100'));
  assert.equal(elements.activeFilters.textContent, 'Month: All · Department: All · Region: All');

  // Exercise the real export click handler and inspect the generated Blob.
  // Expected IDs are fixed independently of the production filter function.
  elements.month.value = '2026-03';
  elements.region.value = 'West';
  elements.month.events.change();
  elements.sort.value = 'actual';
  elements.sort.events.change();
  elements.export.events.click();
  const exported = (await app.downloads.blob.text()).split('\r\n');
  assert.equal(exported[0], 'id,month,department,region,budget,actual,variance,variance_percent,transactions,cost_per_transaction');
  const exportedRows = exported.slice(1).map(line => line.split(','));
  assert.equal(exportedRows.length, 5, 'Export must contain only the five selected summaries');
  assert.deepEqual(exportedRows.map(row => row[0]), ['FIN-044', 'FIN-048', 'FIN-056', 'FIN-052', 'FIN-060']);
  assert.deepEqual(exportedRows.map(row => Number(row[5])), [120889, 89027, 84771, 69049, 48543]);
  for (const row of exportedRows) {
    assert.equal(row.length, 10);
    assert.equal(row[1], '2026-03');
    assert.equal(row[3], 'West');
    const source = context.RetailData.records.find(record => record.id === row[0]);
    assert.equal(row[2], source.department);
    assert.equal(Number(row[4]), source.budget);
    assert.equal(Number(row[5]), source.actual);
    assert.equal(Number(row[6]), source.actual - source.budget);
    assert.equal(row[7], ((source.actual - source.budget) / source.budget * 100).toFixed(4));
    assert.equal(Number(row[8]), source.transactions);
    assert.equal(row[9], (source.actual / source.transactions).toFixed(4));
  }
  // Scenario values must never leak into exported recorded actuals.
  elements.adjustment.value = '-5';
  elements.adjustment.events.input();
  elements.export.events.click();
  assert.equal(await app.downloads.blob.text(), exported.join('\r\n'));
  elements.department.value = 'Marketing';
  elements.department.events.change();
  elements.export.events.click();
  const singleExport = (await app.downloads.blob.text()).split('\r\n');
  assert.equal(singleExport.length, 2);
  assert.equal(singleExport[1].split(',')[0], 'FIN-052');
  assert.equal(JSON.stringify(context.RetailData.records), before);

  const zero = loadApp([{
    id: 'TEST', month: '2026-01', department: 'Administration', region: 'North',
    budget: 0, actual: 100, transactions: 0
  }]);
  assert.equal((zero.elements.cards.innerHTML.match(/N\/A/g) || []).length, 2);
  assert.equal((zero.elements.rows.innerHTML.match(/N\/A/g) || []).length, 2);
  zero.elements.export.events.click();
  assert.ok((await zero.downloads.blob.text()).includes(',100,N/A,0,N/A'));
  assert.equal(zero.downloads.filename, 'fictional-finance-summaries.csv');
  console.log('PASS: presentation, empty selection, N/A, selected CSV records/order/values and unchanged scenario actuals');
}
if (require.main === module) {
  run().catch(error => { console.error(error); process.exitCode = 1; });
} else {
  module.exports = run;
}
