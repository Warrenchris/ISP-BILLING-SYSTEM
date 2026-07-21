const dashboardController = require('./src/controllers/dashboardController');
const { Subscription, DataPlan, Payment, RadAcct, sequelize } = require('./src/models');

// Mock Sequelize models to simulate DB query latencies (5ms per DB round-trip)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

DataPlan.findAll = async () => { await delay(5); return [{ id: 'plan-1', name: 'Home Fiber 10Mbps', price: 2500 }, { id: 'plan-2', name: 'BAMBIKA', price: 1500 }]; };
Subscription.count = async () => { await delay(5); return 120; };
Subscription.findAll = async () => { await delay(5); return [{ id: 'sub-1' }, { id: 'sub-2' }]; };
Payment.sum = async () => { await delay(5); return 180000; };
Subscription.sum = async () => { await delay(5); return 450 * 1024 * 1024 * 120; };
RadAcct.count = async () => { await delay(5); return 42; };
sequelize.query = async () => { await delay(8); return [[{ id: 1, name: 'Alice', total_bytes: 50000000000, download_bytes: 40000000000, upload_bytes: 10000000000 }]]; };

async function runBenchmark() {
  console.log("==========================================================");
  console.log("BENCHMARK: ENDPOINT CONTROLLER LATENCY PROFILE (5ms DB RTT)");
  console.log("==========================================================");

  const req = { query: {} };
  const res = { json: (data) => data, status: () => res };
  const next = (err) => { if (err) console.error("Endpoint error:", err); };

  // Benchmark 10 iterations
  const times1 = [];
  for (let i = 0; i < 10; i++) {
    const start = process.hrtime.bigint();
    await dashboardController.getCentipidParityData(req, res, next);
    const end = process.hrtime.bigint();
    times1.push(Number(end - start) / 1e6);
  }

  const avg1 = times1.reduce((a, b) => a + b, 0) / times1.length;
  console.log(`1. getCentipidParityData latency (10 runs avg): ${avg1.toFixed(2)} ms`);

  const times2 = [];
  for (let i = 0; i < 10; i++) {
    const start = process.hrtime.bigint();
    await dashboardController.getRetentionTrend(req, res, next);
    const end = process.hrtime.bigint();
    times2.push(Number(end - start) / 1e6);
  }

  const avg2 = times2.reduce((a, b) => a + b, 0) / times2.length;
  console.log(`2. getRetentionTrend latency (10 runs avg):      ${avg2.toFixed(2)} ms`);
  console.log("==========================================================");

  process.exit(0);
}

runBenchmark().catch(err => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
