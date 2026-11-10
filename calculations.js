/* Pure functions: these never read the page or change the supplied records.
   globalThis works in a browser and in a JavaScript test environment. */
globalThis.FinanceCalculations = (() => {
  function totals(rows) {
    return rows.reduce((sum, row) => ({
      budget: sum.budget + row.budget,
      actual: sum.actual + row.actual,
      transactions: sum.transactions + row.transactions
    }), { budget: 0, actual: 0, transactions: 0 });
  }

  // Positive expense variance means spending is over budget (unfavorable).
  function variance(actual, budget) {
    return actual - budget;
  }

  // null means the ratio is undefined; the page displays it as N/A.
  function variancePercent(actual, budget) {
    return budget === 0 ? null : variance(actual, budget) / budget * 100;
  }

  function costPerTransaction(actual, transactions) {
    return transactions === 0 ? null : actual / transactions;
  }

  function filterRows(rows, filters) {
    return rows.filter(row => ['month', 'department', 'region'].every(key =>
      !filters[key] || filters[key] === 'all' || row[key] === filters[key]
    ));
  }

  function group(rows, key) {
    return [...new Set(rows.map(row => row[key]))].map(name => ({
      name,
      ...totals(rows.filter(row => row[key] === name))
    }));
  }

  function sorted(rows, sort) {
    return [...rows].sort((a, b) => {
      if (sort === 'variance') {
        return variance(b.actual, b.budget) - variance(a.actual, a.budget);
      }
      if (sort === 'actual') return b.actual - a.actual;
      return a.id.localeCompare(b.id);
    });
  }

  function validAdjustment(adjustment) {
    return Number.isFinite(adjustment) && adjustment >= -100 && adjustment <= 200;
  }

  function scenario(summary, adjustment) {
    if (!validAdjustment(adjustment)) return null;
    const expense = summary.actual * (1 + adjustment / 100);
    return {
      expense,
      variance: variance(expense, summary.budget),
      change: expense - summary.actual
    };
  }

  return {
    totals, variance, variancePercent, costPerTransaction,
    filterRows, group, sorted, validAdjustment, scenario
  };
})();
