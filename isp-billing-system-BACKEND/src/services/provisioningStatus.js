/**
 * Provisioning Status Tracker
 *
 * Tracks the operational state of the provisioning subsystem so that:
 *  - The /health endpoint reports provisioning status (not just "OK")
 *  - An admin or monitoring tool can detect degraded mode immediately
 *  - The dashboard can show a banner when provisioning is down
 *
 * States:
 *  - 'operational'  — Worker + schedulers running, Redis connected
 *  - 'degraded'     — Partially running (e.g. worker up but scheduler failed)
 *  - 'down'         — Redis unreachable or workers failed to start
 *  - 'disabled'     — MOCK_MIKROTIK=true (expected in dev/CI)
 */

const state = {
  status: 'down',         // Current status
  since: new Date(),      // When this status was set
  reason: 'Not yet initialized',
  details: {
    worker: false,
    expiryScheduler: false,
    reconciliationScheduler: false,
    redisConnected: false,
  },
};

/**
 * Set provisioning status.
 * @param {'operational'|'degraded'|'down'|'disabled'} status
 * @param {string} reason - Human-readable explanation
 * @param {object} [details] - Component-level status overrides
 */
function setStatus(status, reason, details = {}) {
  state.status = status;
  state.since = new Date();
  state.reason = reason;
  Object.assign(state.details, details);
}

/**
 * Get current provisioning status (for /health endpoint and admin API).
 */
function getStatus() {
  return {
    status: state.status,
    since: state.since.toISOString(),
    reason: state.reason,
    details: { ...state.details },
  };
}

/**
 * Check if provisioning is operational.
 */
function isOperational() {
  return state.status === 'operational' || state.status === 'disabled';
}

module.exports = {
  setStatus,
  getStatus,
  isOperational,
};
