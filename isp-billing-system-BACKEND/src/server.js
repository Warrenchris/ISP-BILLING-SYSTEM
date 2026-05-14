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

// Check M-Pesa shortcode
const mpesaShortcode = process.env.MPESA_BUSINESS_SHORT_CODE || process.env.MPESA_SHORTCODE;
if (!mpesaShortcode) {
  console.error('❌  CRITICAL ERROR: M-Pesa shortcode is missing from environment variables.');
  console.error('    Please set MPESA_BUSINESS_SHORT_CODE in your .env file.');
  process.exit(1);
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
  console.log('🧱   Syncing Sequelize models…');
  await syncDatabase(false);          // change to `true` to force‑sync
  console.log('✅   Models synced');

  // 4‑c  Start Express
  console.log('🚀  Starting HTTP server…');
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ISP Billing System API
  → env        : ${process.env.NODE_ENV || 'development'}
  → base URL   : http://localhost:${PORT}
  → health     : http://localhost:${PORT}/health
  → docs       : http://localhost:${PORT}/api/docs
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
