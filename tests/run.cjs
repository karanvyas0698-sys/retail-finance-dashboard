// One command, no packages: node tests/run.cjs
async function run() {
  require('./calculations.test.cjs');
  await require('./rendering.test.cjs')();
  console.log('PASS: all automated checks completed');
}

if (require.main === module) {
  run().catch(error => { console.error(error); process.exitCode = 1; });
} else {
  module.exports = run;
}
