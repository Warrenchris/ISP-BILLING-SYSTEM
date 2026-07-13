/**
 * MikroTik RouterOS API Client
 *
 * Connection-pooled wrapper with circuit breaker, exponential backoff,
 * and automatic audit logging to router_command_log.
 *
 * Usage:
 *   const client = require('./client');
 *   await client.execute(deviceId, '/ip/address/print', {}, 'system');
 */

const logger = require('../../config/logger');

// ── Circuit Breaker States ─────────────────────────────────────────────
const CIRCUIT_CLOSED = 'closed';       // Normal operation
const CIRCUIT_OPEN = 'open';           // Failing — reject calls
const CIRCUIT_HALF_OPEN = 'half_open'; // Testing if recovered

const CIRCUIT_FAILURE_THRESHOLD = 5;   // Failures before opening
const CIRCUIT_RESET_TIMEOUT_MS = 60000; // How long to stay open before half-open
const MAX_RECONNECT_DELAY_MS = 30000;   // Cap for exponential backoff

// ── Connection & Circuit State ─────────────────────────────────────────
const connections = new Map();    // deviceId → { api, connected }
const circuitStates = new Map();  // deviceId → { state, failureCount, lastFailure, nextAttempt }

/**
 * Determine whether to use the real RouterOS client or the mock.
 */
function isMockMode() {
  return process.env.MOCK_MIKROTIK === 'true';
}

/**
 * Get or create circuit breaker state for a device.
 */
function getCircuit(deviceId) {
  if (!circuitStates.has(deviceId)) {
    circuitStates.set(deviceId, {
      state: CIRCUIT_CLOSED,
      failureCount: 0,
      lastFailure: null,
      nextAttempt: null,
    });
  }
  return circuitStates.get(deviceId);
}

/**
 * Record a successful call — reset circuit to closed.
 */
function recordSuccess(deviceId) {
  const circuit = getCircuit(deviceId);
  circuit.state = CIRCUIT_CLOSED;
  circuit.failureCount = 0;
  circuit.lastFailure = null;
  circuit.nextAttempt = null;
}

/**
 * Record a failed call — potentially open the circuit.
 */
function recordFailure(deviceId) {
  const circuit = getCircuit(deviceId);
  circuit.failureCount += 1;
  circuit.lastFailure = Date.now();

  if (circuit.failureCount >= CIRCUIT_FAILURE_THRESHOLD) {
    circuit.state = CIRCUIT_OPEN;
    circuit.nextAttempt = Date.now() + CIRCUIT_RESET_TIMEOUT_MS;
    logger.warn(`Circuit breaker OPENED for device ${deviceId} after ${circuit.failureCount} failures`);
  }
}

/**
 * Check if the circuit allows a call. Transitions open → half_open if timeout elapsed.
 */
function canAttempt(deviceId) {
  const circuit = getCircuit(deviceId);

  if (circuit.state === CIRCUIT_CLOSED) return true;

  if (circuit.state === CIRCUIT_OPEN && Date.now() >= circuit.nextAttempt) {
    circuit.state = CIRCUIT_HALF_OPEN;
    logger.info(`Circuit breaker HALF-OPEN for device ${deviceId}, allowing probe request`);
    return true;
  }

  if (circuit.state === CIRCUIT_HALF_OPEN) return true;

  return false; // OPEN and timeout not elapsed
}

/**
 * Connect to a MikroTik router by looking up its credentials from the DB.
 */
async function connect(device) {
  const deviceId = device.id;

  // Already connected?
  if (connections.has(deviceId)) {
    const conn = connections.get(deviceId);
    if (conn.connected) return conn;
  }

  if (isMockMode()) {
    const MockClient = require('./mockClient');
    const mockConn = { api: new MockClient(device), connected: true, device };
    connections.set(deviceId, mockConn);
    logger.info(`[MOCK] Connected to router "${device.name}" (${device.ipAddress})`);
    return mockConn;
  }

  // Real RouterOS connection
  const { RouterOSClient } = require('routeros-client');

  const password = device.getDecryptedPassword();
  let delay = 1000;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const api = new RouterOSClient({
        host: device.ipAddress,
        port: device.apiPort,
        user: device.username,
        password: password,
        timeout: 10,
      });

      await api.connect();
      const conn = { api, connected: true, device };
      connections.set(deviceId, conn);
      logger.info(`Connected to router "${device.name}" (${device.ipAddress}:${device.apiPort})`);
      return conn;

    } catch (err) {
      logger.warn(`Router connect attempt ${attempt}/3 failed for "${device.name}": ${err.message}`);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, MAX_RECONNECT_DELAY_MS);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Disconnect from a router.
 */
async function disconnect(deviceId) {
  const conn = connections.get(deviceId);
  if (!conn) return;

  try {
    if (!isMockMode() && conn.api && typeof conn.api.disconnect === 'function') {
      await conn.api.disconnect();
    }
    logger.info(`Disconnected from router ${deviceId}`);
  } catch (err) {
    logger.warn(`Error disconnecting from router ${deviceId}: ${err.message}`);
  } finally {
    connections.delete(deviceId);
  }
}

/**
 * Execute a command on a router with audit logging.
 *
 * @param {object} device - NetworkDevice model instance
 * @param {string} command - RouterOS command path (e.g. '/ip/firewall/address-list/add')
 * @param {object} params - Command parameters
 * @param {string} triggeredBy - Who triggered this (user_id, 'cron:expiry', 'mpesa:<receipt>', etc.)
 * @returns {object} Command result
 */
async function execute(device, command, params = {}, triggeredBy = 'system') {
  const deviceId = device.id;
  const startTime = Date.now();

  // Import model lazily to avoid circular deps at module load time
  const RouterCommandLog = require('../../models/RouterCommandLog');

  // Circuit breaker check
  if (!canAttempt(deviceId)) {
    const circuit = getCircuit(deviceId);
    const err = new Error(`Circuit breaker OPEN for device "${device.name}" (${deviceId}). Next attempt at ${new Date(circuit.nextAttempt).toISOString()}`);
    err.code = 'CIRCUIT_OPEN';
    err.retryAfterMs = Math.max(0, circuit.nextAttempt - Date.now());

    // Log the blocked attempt
    await RouterCommandLog.create({
      deviceId,
      command,
      params,
      triggeredBy,
      result: null,
      success: false,
      errorMessage: err.message,
      durationMs: Date.now() - startTime,
    }).catch(logErr => logger.error('Failed to write command log', { error: logErr.message }));

    throw err;
  }

  let result = null;
  let success = false;
  let errorMessage = null;

  try {
    // Ensure we're connected
    const conn = await connect(device);

    if (isMockMode()) {
      result = await conn.api.execute(command, params);
    } else {
      // routeros-client uses menu-based API
      const menu = conn.api.menu(command);

      // Determine operation based on command suffix
      if (command.endsWith('/print') || command.endsWith('/getall')) {
        result = await menu.where(params).get();
      } else if (command.endsWith('/add')) {
        result = await menu.add(params);
      } else if (command.endsWith('/remove')) {
        result = await menu.remove(params.id || params['.id']);
      } else if (command.endsWith('/set')) {
        result = await menu.where({ '.id': params['.id'] || params.id }).update(params);
      } else {
        // Generic command execution
        result = await menu.exec(params);
      }
    }

    success = true;
    recordSuccess(deviceId);

  } catch (err) {
    errorMessage = err.message;
    recordFailure(deviceId);

    // If connection dropped, clean up so next call reconnects
    if (err.message.includes('ECONNREFUSED') ||
        err.message.includes('ETIMEDOUT') ||
        err.message.includes('Socket closed') ||
        err.message.includes('Connection closed')) {
      connections.delete(deviceId);
    }

    // Propagate circuit breaker state info on the error
    const circuit = getCircuit(deviceId);
    err.circuitState = circuit.state;
    if (circuit.state === CIRCUIT_OPEN) {
      err.code = 'CIRCUIT_OPEN';
      err.retryAfterMs = Math.max(0, circuit.nextAttempt - Date.now());
    }

    throw err;

  } finally {
    // Audit log — always write, success or failure
    const durationMs = Date.now() - startTime;
    await RouterCommandLog.create({
      deviceId,
      command,
      params,
      triggeredBy,
      result: success ? result : null,
      success,
      errorMessage,
      durationMs,
    }).catch(logErr => logger.error('Failed to write command log', { error: logErr.message }));
  }

  return result;
}

/**
 * Get the circuit breaker state for a device.
 * @returns {'closed'|'open'|'half_open'}
 */
function getCircuitState(deviceId) {
  const circuit = getCircuit(deviceId);

  // Auto-transition open → half_open if timeout elapsed
  if (circuit.state === CIRCUIT_OPEN && Date.now() >= circuit.nextAttempt) {
    circuit.state = CIRCUIT_HALF_OPEN;
  }

  return circuit.state;
}

/**
 * Get the connection status for a device.
 * @returns {'connected'|'disconnected'|'circuit_open'}
 */
function getConnectionStatus(deviceId) {
  const circuit = getCircuitState(deviceId);
  if (circuit === CIRCUIT_OPEN) return 'circuit_open';

  const conn = connections.get(deviceId);
  return (conn && conn.connected) ? 'connected' : 'disconnected';
}

/**
 * Reset all connections and circuit states (useful for tests).
 */
function resetAll() {
  connections.clear();
  circuitStates.clear();
}

module.exports = {
  connect,
  disconnect,
  execute,
  getCircuitState,
  getConnectionStatus,
  canAttempt,
  resetAll,
  // Exported for testing
  CIRCUIT_CLOSED,
  CIRCUIT_OPEN,
  CIRCUIT_HALF_OPEN,
};
