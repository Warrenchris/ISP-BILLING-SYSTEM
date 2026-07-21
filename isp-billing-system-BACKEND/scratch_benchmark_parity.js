const dashboardController = require('./src/controllers/dashboardController');

async function runBenchmark() {
  console.log("==========================================================");
  console.log("BENCHMARK: ENDPOINT EXECUTION TIMING PROFILE");
  console.log("==========================================================");

  const req = { query: {} };
  const res = { json: (data) => data, status: () => res };
  const next = (err) => { if (err) console.error("Endpoint error:", err); };

  // 1. Benchmark getCentipidParityData
  const start1 = process.hrtime.bigint();
  await dashboardController.getCentipidParityData(req, res, next);
  const end1 = process.hrtime.bigint();
  const dur1Ms = Number(end1 - start1) / 1e6;

  console.log(`1. getCentipidParityData execution time: ${dur1Ms.toFixed(2)} ms`);

  // 2. Benchmark getRetentionTrend
  const start2 = process.hrtime.bigint();
  await dashboardController.getRetentionTrend(req, res, next);
  const end2 = process.hrtime.bigint();
  const dur2Ms = Number(end2 - start2) / 1e6;

  console.log(`2. getRetentionTrend execution time:      ${dur2Ms.toFixed(2)} ms`);
  console.log("==========================================================");

  process.exit(0);
}

runBenchmark().catch(err => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
