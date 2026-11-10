/* Fictional USD expense summaries, not real company data.
   No randomness: the same formulas produce the same 100 records every time. */
globalThis.RetailData = (() => {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];
  const departments = [
    'Store Operations', 'Logistics', 'Marketing', 'Technology', 'Administration'
  ];
  const regions = ['North', 'South', 'East', 'West'];
  const baseBudgets = [100000, 80000, 50000, 70000, 40000];
  const baseRates = [0.07, -0.04, 0.12, 0.03, -0.06];
  const records = [];

  // m, d and r are zero-based positions in the lists above.
  months.forEach((month, m) => {
    departments.forEach((department, d) => {
      regions.forEach((region, r) => {
        const budget = baseBudgets[d] + m * 2400 + r * 1800;
        const rate = baseRates[d] + (r - 1.5) * 0.018 + (m - 2) * 0.012;
        records.push({
          id: 'FIN-' + String(records.length + 1).padStart(3, '0'),
          month,
          department,
          region,
          budget,
          actual: Math.round(budget * (1 + rate)),
          transactions: 1800 + m * 130 + r * 170 + d * 210
        });
      });
    });
  });

  return { months, departments, regions, records };
})();
