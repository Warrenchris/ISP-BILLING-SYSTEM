/**
 * src/server.js
 * -------------
 * One single place that:
 *  1. Loads .env
 *  2. Loads the Express app
 *  3. Tests / syncs the database
 *  4. Starts the HTTP server
 *  5. Logs EVERY step so we can see exactly where it stops.
 */

console.log('🧪  Step 0 – entering server.js');

require('dotenv').config();               // ← loads .env

// Validate all required environment variables at startup
const requiredEnvVars = [
  'ROUTER_ENCRYPTION_KEY',
  'JWT_SECRET',
  'RADIUS_SHARED_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'REDIS_HOST',
  'REDIS_PORT'
];

if ((process.env.SMS_PROVIDER || 'mock') !== 'mock') {
  requiredEnvVars.push('AT_API_KEY', 'AT_USERNAME');
}

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌  CRITICAL STARTUP ERROR: The following required environment variables are missing:');
  missingEnvVars.forEach(varName => {
    console.error(`    - ${varName}`);
  });
  console.error('    Please configure them in your environment or .env file before starting the server.');
  process.exit(1);
}

// Check M-Pesa shortcode
const mpesaShortcode = process.env.MPESA_BUSINESS_SHORT_CODE || process.env.MPESA_SHORTCODE;
if (!mpesaShortcode) {
  console.error('❌  CRITICAL ERROR: M-Pesa shortcode is missing from environment variables.');
  console.error('    Please set MPESA_BUSINESS_SHORT_CODE in your .env file.');
  process.exit(1);
}

// Check Router Encryption Key
const routerEncryptionKey = process.env.ROUTER_ENCRYPTION_KEY;
if (!routerEncryptionKey) {
  console.error('❌  CRITICAL ERROR: ROUTER_ENCRYPTION_KEY is missing from environment variables.');
  console.error('    Please set ROUTER_ENCRYPTION_KEY in your .env file.');
  process.exit(1);
}
if (!/^[0-9a-fA-F]{64}$/.test(routerEncryptionKey)) {
  console.error('❌  CRITICAL ERROR: ROUTER_ENCRYPTION_KEY must be a valid 32-byte hex string (64 characters).');
  process.exit(1);
}

// Check BYPASS_IP_CHECK production guard
if (process.env.NODE_ENV === 'production' && process.env.BYPASS_IP_CHECK === 'true') {
  console.error('❌  CRITICAL ERROR: BYPASS_IP_CHECK cannot be set to "true" in production mode.');
  process.exit(1);
}

// Check MPESA_CALLBACK_TOKEN presence in production
if (process.env.NODE_ENV === 'production' && !process.env.MPESA_CALLBACK_TOKEN) {
  console.error('❌  CRITICAL ERROR: MPESA_CALLBACK_TOKEN is missing from environment variables in production.');
  console.error('    Please set MPESA_CALLBACK_TOKEN in your production .env file.');
  process.exit(1);
}

// Check RADIUS_DB_PASSWORD strength and presence in production
if (process.env.NODE_ENV === 'production') {
  const radiusDbPassword = process.env.RADIUS_DB_PASSWORD;
  if (!radiusDbPassword || radiusDbPassword === 'radiuspassword') {
    console.error('❌  CRITICAL ERROR: RADIUS_DB_PASSWORD is missing or set to the weak fallback "radiuspassword" in production.');
    process.exit(1);
  }
}
console.log('🧪  Step 1 – dotenv loaded');

let app;
try {
  app = require('./app');                 // ← your Express app
  console.log('🧪  Step 2 – app module loaded');
} catch (err) {
  console.error('❌  Failed to load ./app:', err);
  process.exit(1);
}

let syncDatabase;
try {
  ({ syncDatabase } = require('./models'));
  console.log('🧪  Step 3 – models & database helpers loaded');
} catch (err) {
  console.error('❌  Failed to load models or database helpers:', err);
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
let server;                                // ⬅ holds http.Server for shutdown

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑  Received ${signal}. Shutting down…`);
  try {
    if (server) await new Promise(r => server.close(r));
    console.log('✅  HTTP server closed');

    const { sequelize } = require('./config/database');
    await sequelize.close();
    console.log('✅  DB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('❌  Error during shutdown:', err);
    process.exit(1);
  }
};

const waitForDatabase = async (maxRetries = 10, delayMs = 5000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { sequelize } = require('./config/database');
      await sequelize.authenticate();
      console.log('✅   DB connection OK');
      return;
    } catch (error) {
      console.error(
        `❌ DB connection attempt ${attempt}/${maxRetries} failed:`,
        error.message
      );
      if (attempt === maxRetries) {
        throw new Error(
          `Could not connect to database after ${maxRetries} attempts`
        );
      }
      console.log(`⏳ Waiting ${delayMs / 1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

const startServer = async () => {
  console.log('🧪  Step 4 – inside startServer()');

  // 4‑a  Test DB connection
  console.log('🔌   Testing DB connection…');
  await waitForDatabase();

  // 4‑b  Sync models
  if (process.env.NODE_ENV === 'test') {
    console.log('🧱   Syncing Sequelize models (Test environment)…');
    await syncDatabase(false);
    console.log('✅   Models synced');
  } else {
    console.log('ℹ️   Skipping model sync (migrations are the source of truth)');
  }

  // 4‑c  Phase 1: Start BullMQ workers and schedulers
  console.log('⚡   Starting Phase 1 provisioning workers…');
  const provisioningStatus = require('./services/provisioningStatus');

  if (process.env.MOCK_MIKROTIK === 'true') {
    provisioningStatus.setStatus('disabled', 'MOCK_MIKROTIK=true — no real router connected (dev/CI mode)', {
      worker: false, expiryScheduler: false, reconciliationScheduler: false, redisConnected: false,
    });
    console.log('ℹ️   MOCK_MIKROTIK=true — provisioning in mock mode');
  }

  try {
    const { startWorker } = require('./services/queue/provisioningWorker');
    const { startExpiryScheduler } = require('./jobs/expireSubscriptions');
    const { startReconciliationScheduler } = require('./jobs/reconcileProvisioning');
    const { startAccountingWatcher } = require('./jobs/accountingWatcher');
    // Phase 3: SMS Worker and Dunning Scheduler
    const { startWorker: startSmsWorker } = require('./services/queue/smsWorker');
    const { startDunningScheduler } = require('./jobs/sendSmsReminders');
    // Voucher Generation Worker
    const { startWorker: startVoucherWorker } = require('./services/queue/voucherWorker');

    startWorker();
    startExpiryScheduler();
    startReconciliationScheduler();
    startAccountingWatcher();
    startSmsWorker();
    startDunningScheduler();
    startVoucherWorker();

    // Only mark as 'operational' if not in mock mode (mock stays 'disabled')
    if (process.env.MOCK_MIKROTIK !== 'true') {
      provisioningStatus.setStatus('operational', 'All workers and schedulers running', {
        worker: true, expiryScheduler: true, reconciliationScheduler: true, redisConnected: true,
      });
    } else {
      // In mock mode, still track that workers started
      provisioningStatus.setStatus('disabled', 'MOCK_MIKROTIK=true — workers running in mock mode', {
        worker: true, expiryScheduler: true, reconciliationScheduler: true, redisConnected: true,
      });
    }

    console.log('✅   Provisioning workers, dunning schedulers, and watchers started');
  } catch (queueErr) {
    // Don't crash the server — but mark provisioning as DOWN so /health returns 503
    provisioningStatus.setStatus('down', `Failed to start: ${queueErr.message}`, {
      worker: false, expiryScheduler: false, reconciliationScheduler: false, redisConnected: false,
    });
    console.error('🚨   PROVISIONING IS DOWN — Redis may be unavailable:', queueErr.message);
    console.error('     /health will return 503 (DEGRADED) until this is resolved.');
    console.error('     Payments will succeed but customers will NOT get connected.');
  }

  // 4‑d  Start Express
  console.log('🚀  Starting HTTP server…');
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ISP Billing System API
  → env        : ${process.env.NODE_ENV || 'development'}
  → base URL   : http://localhost:${PORT}
  → health     : http://localhost:${PORT}/health
  → docs       : http://localhost:${PORT}/api/docs
  → mock router: ${process.env.MOCK_MIKROTIK === 'true' ? 'YES (no real router)' : 'NO (real router mode)'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  });
};

startServer().catch((err) => {
  console.error('❌  startServer() crashed:', err);
  process.exit(1);
});

// ──────────────────────────────
//  System‑level error handlers
// ──────────────────────────────
['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => gracefulShutdown(sig)));
process.on('unhandledRejection',  (err) => { console.error('❌  UNHANDLED REJECTION',  err); });
process.on('uncaughtException',   (err) => { console.error('❌  UNCAUGHT EXCEPTION',   err); });
