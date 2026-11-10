/* Page rendering, event handlers, browser storage and CSV download.
   data.js and calculations.js must load before this file. */
(() => {
  const { months, departments, regions, records } = RetailData;
  const finance = FinanceCalculations;
  const storageKey = 'retail-finance-scenario-v1';
  const filterNames = ['month', 'department', 'region'];
  const element = id => document.getElementById(id);
  const currencyFormat = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  });
  const money = value => value === null ? 'N/A' : currencyFormat.format(value);
  const percent = value => value === null ? 'N/A' : value.toFixed(1) + '%';
  const monthName = month => new Date(month + '-01T12:00:00')
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const budgetPosition = value => value > 0 ? 'over' : value < 0 ? 'under' : 'at';

  function selectedRows() {
    const filters = {};
    filterNames.forEach(name => { filters[name] = element(name).value; });
    return finance.filterRows(records, filters);
  }

  function makeOptions(id, values) {
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All ' + (id === 'month' ? 'months' : id + 's');
    element(id).appendChild(allOption);
    values.forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = id === 'month' ? monthName(value) : value;
      element(id).appendChild(option);
    });
    element(id).addEventListener('change', render);
  }

  function renderScenario() {
    const adjustment = element('adjustment').valueAsNumber;
    const result = finance.scenario(finance.totals(selectedRows()), adjustment);
    element('notice').textContent = '';
    if (!result) {
      element('scenarioResult').textContent = '';
      element('notice').textContent = 'Enter a percentage from −100 to 200.';
      return;
    }
    element('scenarioResult').textContent =
      `Scenario expense: ${money(result.expense)} · ` +
      `${money(Math.abs(result.variance))} ${budgetPosition(result.variance)} budget · ` +
      `${adjustment <= 0 ? 'Savings' : 'Additional expense'}: ${money(Math.abs(result.change))}.`;
  }

  function renderCards(summary) {
    const variance = finance.variance(summary.actual, summary.budget);
    const status = variance > 0 ? 'Unfavorable' : variance < 0 ? 'Favorable' : 'On budget';
    const cards = [
      ['Expense budget', money(summary.budget), 'Selected scope', ''],
      ['Actual expenses', money(summary.actual), 'Recorded actuals', ''],
      ['Expense variance', money(variance),
        percent(finance.variancePercent(summary.actual, summary.budget)) + ' · ' + status,
        variance > 0 ? 'bad' : 'good'],
      ['Cost / transaction', money(finance.costPerTransaction(summary.actual, summary.transactions)),
        summary.transactions.toLocaleString('en-US') + ' transactions', '']
    ];
    element('cards').innerHTML = cards.map(([label, value, note, color]) => `
      <div class="card">
        <span class="muted">${label}</span>
        <strong class="${color}">${value}</strong><small>${note}</small>
      </div>`).join('');
  }

  function renderBrief(summary, groups) {
    if (!groups.length) {
      element('insight').textContent = 'No records match this selection.';
      return;
    }
    const variance = finance.variance(summary.actual, summary.budget);
    const ratio = finance.variancePercent(summary.actual, summary.budget);
    const worst = groups[0];
    const overrun = finance.variance(worst.actual, worst.budget);
    element('insight').textContent =
      `Expenses are ${money(Math.abs(variance))} ${budgetPosition(variance)} budget ` +
      `(${percent(ratio === null ? null : Math.abs(ratio))}). ` +
      (overrun > 0
        ? `${worst.name} has the largest departmental overrun at ${money(overrun)}. `
        : 'No department in this selection is over budget. ') +
      'Review the underlying drivers before attributing a cause.';
  }

  function renderCharts(rows, departments) {
    const largestVariance = Math.max(...departments.map(group =>
      Math.abs(finance.variance(group.actual, group.budget))), 1);
    element('departmentChart').innerHTML = departments.map(group => {
      const variance = finance.variance(group.actual, group.budget);
      return `<div class="barrow">
        <span>${group.name}</span>
        <div class="track"><div class="fill ${variance > 0 ? 'over' : ''}"
          style="width:${Math.abs(variance) / largestVariance * 100}%"></div></div>
        <strong class="${variance > 0 ? 'bad' : 'good'}">${money(variance)}</strong>
      </div>`;
    }).join('');

    const monthlyGroups = finance.group(rows, 'month');
    const largestAmount = Math.max(...monthlyGroups.flatMap(group => [group.actual, group.budget]), 1);
    element('monthChart').innerHTML = monthlyGroups.map(group => `
      <div class="series">
        <small>${monthName(group.name)} · Budget ${money(group.budget)} / Actual ${money(group.actual)}</small>
        <div class="track"><div class="fill budget" style="width:${group.budget / largestAmount * 100}%"></div></div>
        <div class="track"><div class="fill actual" style="width:${group.actual / largestAmount * 100}%"></div></div>
      </div>`).join('');
  }

  function renderTable(rows) {
    element('rows').innerHTML = finance.sorted(rows, element('sort').value).map(row => `
      <tr>
        <td>${row.id}</td><td>${monthName(row.month)}</td>
        <td>${row.department}</td><td>${row.region}</td>
        <td>${money(row.budget)}</td><td>${money(row.actual)}</td>
        <td class="${row.actual > row.budget ? 'bad' : 'good'}">${money(finance.variance(row.actual, row.budget))}</td>
        <td>${percent(finance.variancePercent(row.actual, row.budget))}</td>
        <td>${row.transactions.toLocaleString('en-US')}</td>
        <td>${money(finance.costPerTransaction(row.actual, row.transactions))}</td>
      </tr>`).join('');
  }

  function render() {
    const rows = selectedRows();
    const summary = finance.totals(rows);
    const groups = finance.sorted(finance.group(rows, 'department'), 'variance');
    element('count').textContent = `${rows.length} of ${records.length} records`;
    renderCards(summary);
    renderBrief(summary, groups);
    renderCharts(rows, groups);
    renderTable(rows);
    renderScenario();
  }

  // CSV keeps the original columns, precision and current table sort order.
  function makeCsv(rows) {
    const decimal = value => value === null ? '' : value.toFixed(4);
    const escapeCell = value => /[",\r\n]/.test(String(value))
      ? '"' + String(value).replace(/"/g, '""') + '"' : String(value);
    const header = 'id,month,department,region,budget,actual,variance,variance_percent,transactions,cost_per_transaction';
    return [header, ...rows.map(row => [
      row.id, row.month, row.department, row.region, row.budget, row.actual,
      finance.variance(row.actual, row.budget),
      decimal(finance.variancePercent(row.actual, row.budget)), row.transactions,
      decimal(finance.costPerTransaction(row.actual, row.transactions))
    ].map(escapeCell).join(','))].join('\r\n');
  }

  function exportCsv() {
    const rows = finance.sorted(selectedRows(), element('sort').value);
    const blob = new Blob([makeCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'finance-filtered.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function saveScenario() {
    const adjustment = element('adjustment').valueAsNumber;
    if (!finance.validAdjustment(adjustment)) {
      renderScenario();
      return;
    }
    try {
      localStorage.setItem(storageKey, String(adjustment));
      element('saveStatus').textContent = 'Saved in this browser';
    } catch {
      element('saveStatus').textContent = 'Browser storage unavailable; setting lasts this session';
    }
  }

  function resetScenario() {
    element('adjustment').value = 0;
    try {
      localStorage.removeItem(storageKey);
      element('saveStatus').textContent = 'Scenario reset';
    } catch {
      element('saveStatus').textContent = 'Reset for this session';
    }
    renderScenario();
  }

  // Start after the HTML is parsed (the script tags use defer).
  makeOptions('month', months);
  makeOptions('department', departments);
  makeOptions('region', regions);
  element('sort').addEventListener('change', render);
  element('adjustment').addEventListener('input', () => {
    element('saveStatus').textContent = 'Not saved';
    renderScenario();
  });
  element('reset').addEventListener('click', () => {
    filterNames.forEach(name => { element(name).value = 'all'; });
    render();
  });
  element('saveScenario').addEventListener('click', saveScenario);
  element('clearScenario').addEventListener('click', resetScenario);
  element('export').addEventListener('click', exportCsv);
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null && finance.validAdjustment(Number(saved))) {
      element('adjustment').value = saved;
    }
  } catch {
    // Some browsers block storage for local files. The dashboard still works.
  }
  render();
})();
