# Testing the dashboard

## Automated checks

Use Node.js 22 or newer. No npm install, framework, server, or external service
is required. Node is only needed for tests; the dashboard opens without it.
If `node --version` is not recognized, install Node.js, reopen your terminal,
and verify the version before running the commands below.

From the project folder:

```sh
node --version
node tests/run.cjs
```

The runner executes both test files. A failed assertion prints an error and
exits unsuccessfully; the final PASS message appears only after both finish.
You can also run either file separately:

```sh
node tests/calculations.test.cjs
node tests/rendering.test.cjs
```

Coverage:

1. Exactly 100 summaries with unique IDs.
2. Known totals: budget $7,550,000; actual $7,767,810; transactions 273,500;
   expense variance $217,810.
3. Month and region together, and month/region/department together, with known IDs.
4. Total variance percentage 2.8849006623% and unequal-budget examples that catch
   accidental averaging of row percentages. Cost per transaction uses totals too.
5. Zero budget and zero transactions return `null`, rendered/exported as N/A.
6. Empty filters return no summaries, render helpful messages and export only headers.
7. A 5% reduction gives expense $7,379,419.50, variance −$170,580.50 and change −$388,390.50.
8. Scenarios do not mutate records or input totals, compound when repeated, or change CSV actuals.
9. CSV includes exactly the selected IDs, the selected sort order, the ten expected
   columns and correct financial values, including a single-summary selection.

Rendering tests use a small simulated page and inspect the actual CSV Blob built
by the export button handler. They do not test a real browser's layout, storage,
keyboard behavior or file download dialog. Temporary edge-case fixtures exist
only inside the tests; the original dataset is never edited.

## Short manual browser checklist

- Open `index.html` directly. Confirm the fictional-data badge, 100 summaries,
  budget $7,550,000, actual $7,767,810 and variance $217,810 / 2.9% unfavorable.
- Select March and West: five summaries should remain. Add Marketing: only
  FIN-052 should remain. Reset filters and confirm all 100 return.
- Try each sort, export CSV, and check its IDs/order match the table. In Excel,
  reconcile exported budget and actual totals with the cards.
- Enter −5% with all filters reset. Expect scenario expense $7,379,420 rounded;
  recorded actual stays $7,767,810. Save, reload, and reset the scenario.
- Try a blank adjustment and 201. Check clear errors, then enter a valid value.
- Use Tab/Shift+Tab and arrow keys; check visible focus, filters, resets, sort,
  the scrollable table and the expandable practice questions.
- Check phone width and 200% zoom: cards should stack and the table should scroll.
- For an empty-selection browser check without changing data, follow the
  temporary filter-option example in README.md. Reset filters afterward.

## Execution note

During this update, `node` was not found on the Windows terminal PATH.
The tests were run using the session's built-in Node runtime instead. This does
not install Node on your computer. Real-browser checks remain manual.
