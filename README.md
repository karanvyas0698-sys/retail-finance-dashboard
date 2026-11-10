# Retail Finance Lab

A beginner-friendly finance portfolio project using fictional retail expense
summaries. Explore spending against budget, filter the data, model expense changes,
and export the selected records to CSV. All amounts are in USD.

## Open the app

1. Keep the project files together in the same folder.
2. Double-click `index.html`, or right-click it and choose **Open with** your browser.
3. Enable JavaScript if your browser has it disabled.

No installation, build command, server, framework, login, API key, or internet
connection is needed. Refresh the page after saving code changes.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure: headings, filters, controls and empty containers for results. |
| `styles.css` | Colors, spacing, tables, charts and layouts for smaller screens. |
| `data.js` | Generates exactly the same 100 fictional records on every load. |
| `calculations.js` | Reusable finance math, filtering, grouping and sorting. No page or browser storage access. |
| `app.js` | Connects the data and calculations to the page, handles clicks, renders results, saves settings and exports CSV. |
| `.gitignore` | Excludes local editor files, temporary outputs and potential secrets from Git. |
| `.nojekyll` | Empty marker telling GitHub Pages to serve the static project without Jekyll processing. |
| `tests/calculations.test.cjs` | Optional automated checks using Node's built-in tools. |
| `tests/rendering.test.cjs` | Simulated-page checks for empty selections, N/A display/export and scenario immutability. |

The HTML loads `data.js`, then `calculations.js`, then `app.js` with `defer`, so
they run in that order after the page structure is available. Regular scripts
and relative `./` paths allow both direct `file:` use and repository subfolder
URLs. There are no module imports or data downloads that require a server.

## How the sample data works

There are 5 months (January–May 2026), 5 departments and 4 regions: **100 rows**.
Each row is a department–region–month expense summary, not an individual receipt.
IDs run from `FIN-001` to `FIN-100`. The original record order and values are preserved.

The generator uses zero-based positions `m`, `d` and `r` for month, department
and region. Zero-based means the first item has position 0.

- Base budgets by department: 100000, 80000, 50000, 70000, 40000.
- Base expense rates by department: 0.07, -0.04, 0.12, 0.03, -0.06.
- Budget = base budget + m × 2400 + r × 1800.
- Expense rate = base rate + (r − 1.5) × 0.018 + (m − 2) × 0.012.
- Actual = budget × (1 + expense rate), rounded to a whole dollar.
- Transactions = 1800 + m × 130 + r × 170 + d × 210.

There is no randomness, so refreshing never changes the records. The data contains
no Walmart information and cannot establish real business causes.

## Finance calculations

- **Expense variance:** actual − budget. Positive means over budget (unfavorable);
  negative means under budget (favorable).
- **Variance percentage:** (total actual − total budget) ÷ total budget × 100.
  This uses totals, not an average of the row percentages.
- **Cost per transaction:** total actual ÷ total transactions.
- **Scenario expense:** actual × (1 + adjustment ÷ 100).

For example, actual expenses of $110 against a $100 budget are $10 over budget,
or 10%. A −5% scenario reduces $110 to $104.50 without changing recorded actuals.
Scenario adjustments must be between −100% and 200%, inclusive.
Ratios with a zero denominator return `null`, displayed as **N/A** on the page and in CSV.
Calculations retain precision; the page displays whole dollars and one decimal
place for percentages. CSV ratios use four decimal places.

Full-dataset reconciliation: budget **$7,550,000**, actual **$7,767,810**,
variance **$217,810**, transactions **273,500**.

## Using the controls

The presentation view includes an active-filter summary, KPI cards, department
and monthly comparisons, and written favorable/unfavorable assessments as well
as color. All displayed currency uses USD whole dollars and percentages use one
decimal place. CSV retains its existing precision and ten-column format; the
on-page table adds a readable Assessment column.

- Filters combine month, department and region and update cards, charts and rows.
- Reset filters returns all 100 records; it does not reset the scenario or sort.
- Sorting changes the table order and the CSV order.
- Scenarios apply to the filtered selection and never change the source records.
- Save scenario setting remembers only the adjustment percentage in this browser,
  using the existing `retail-finance-scenario-v1` storage key. Filters are not saved.
- Reset scenario sets the adjustment to zero and removes the saved setting.
- Export filtered CSV downloads `fictional-finance-summaries.csv` with the original ten columns.
- Empty selections show zero totals, N/A ratios and explicit no-summary messages;
  they are not described as on budget. Empty exports contain just the column header.

Browser storage may be blocked for local files. The app catches storage errors
and continues working for the current session. Moving to a hosted URL uses a
different storage location, so an adjustment saved locally may not follow it.

## Testing

With Node.js 22 or newer installed, run from this project folder:

```sh
node tests/run.cjs
```

No packages are required. These checks load the data and finance code without a
browser, demonstrating that the calculations are independent of page rendering.
Node.js is optional and is not required by the app itself.
See [TESTING.md](./TESTING.md) for coverage, runtime requirements and the short
manual browser checklist. The runner needs no additional packages.

Before sharing, also check in your browser:

1. Open `index.html` and confirm 100 records and the reconciliation totals above.
2. Select March and West: five rows should remain. Try each sort order.
3. Enter −5, save, and reload. Try −100 and 200, then an empty or out-of-range value.
4. Reset the scenario and filters. Export CSV and reconcile the totals in Excel.
5. Resize the window and check the table's horizontal scrolling and stacked cards.

### Presentation and accessibility checks

- Open `index.html` directly. Confirm the title and fictional-data badge are visible.
- Select March and West. The active-filter summary should show both choices;
  Reset filters should restore All for all three filters.
- Read the department and monthly comparisons without relying on color:
  favorable/unfavorable text and dollar amounts should explain the result.
- Use only Tab, Shift+Tab, arrow keys, Enter and Space to navigate. Check the
  skip link, visible focus outlines, filter menus, sort menu and reset buttons.
- Focus the table region and use arrow keys to scroll. Verify its sticky column
  headings remain readable and the sort-order message matches the selected sort.
- Try a laptop-width window, a narrow phone-width window (about 375px), and 200%
  browser zoom. Cards and charts should stack, controls should stay usable, and
  horizontal scrolling should stay within the table rather than the whole page.
- Enter −5% in the scenario. Check the adjustment, expense, budget assessment and
  unchanged recorded actual. Try an invalid number to check the error message,
  then use Reset scenario. Expand the analyst questions with Enter or Space.

Automated tests cover the rendered text and controls with a simulated page.
Real-browser layout, keyboard behavior and screen-reader announcements still
need manual checking; browser access was unavailable during this update.

### Manual finance verification examples

1. **All summaries:** reset filters and scenario. Budget should be $7,550,000,
   actual $7,767,810, and variance **$217,810 / 2.9% unfavorable**.
   Cost per transaction is 7,767,810 / 273,500 = 28.401499..., displayed as **$28**.
2. **Favorable result:** select Administration, keeping all months and regions.
   Budget should be $950,000, actual $894,962, and variance **−$55,038 / −5.8% favorable**.
3. **Scenario isolation:** reset filters and enter −5%. Scenario expense is
   $7,379,419.50 (displayed as **$7,379,420**), while recorded actual remains
   **$7,767,810** in the cards and exported source summaries. Save and reset the
   scenario; recorded actual must remain the same throughout.
4. **Weighted percentage:** for two hypothetical summaries with budgets 100 and
   900 and actuals 110 and 900, total variance is 10 / 1000 × 100 = **1%**.
   Averaging the individual percentages (10% and 0%) would incorrectly give 5%.
5. **Zero denominators:** the fictional dataset has none. Without editing it,
   open your browser's developer console and run:

   ```js
   FinanceCalculations.variancePercent(100, 0) // null, displayed as N/A
   FinanceCalculations.costPerTransaction(100, 0) // null, displayed as N/A
   ```

6. **Empty selection:** every normal filter combination has sample data. To
   simulate no matches without changing the dataset, run this in the developer
   console, then check the N/A cards and no-summary messages:

   ```js
   const monthFilter = document.getElementById('month');
   monthFilter.add(new Option('Empty selection test', 'no-match'));
   monthFilter.value = 'no-match';
   monthFilter.dispatchEvent(new Event('change'));
   ```

   Click **Reset filters** to restore the summaries. Refresh to remove the extra
   test option. These console commands change only the page's temporary controls.

The rendering test uses isolated zero-denominator fixtures to check actual N/A
text in cards, rows and CSV. It also tests the empty-selection behavior above.

## GitHub Pages

Keep `index.html` and its CSS/JavaScript files together at the publishing root,
and include the hidden `.nojekyll` file in the repository. Publish that folder
using GitHub Pages. Paths such as `./styles.css` resolve beneath the repository
URL, rather than incorrectly pointing to the account's site root.

This refactor does not publish the project. After deployment, repeat the browser
checks at the actual Pages URL, including CSV download and saved settings.

## Verification limits

The refactor compares all 100 records with the original and checks finance math,
filter combinations, sorting, CSV contents and event handlers programmatically.
Simulated page/storage checks do not replace a real browser. Browser visual QA,
real downloads, actual local storage persistence and a live GitHub Pages deployment
must still be checked before publishing.
