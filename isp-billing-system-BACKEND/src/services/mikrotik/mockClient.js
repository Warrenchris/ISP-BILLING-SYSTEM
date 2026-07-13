/**
 * Mock MikroTik Client
 *
 * In-memory mock that simulates RouterOS API responses for CI/local dev.
 * Keeps state in Maps so integration tests can verify enable/disable flows.
 *
 * Activated when MOCK_MIKROTIK=true
 */

const logger = require('../../config/logger');

class MockMikroTikClient {
  constructor(device) {
    this.device = device;
    this.deviceId = device.id;

    // Shared state across all mock instances (simulates router state)
    if (!MockMikroTikClient._state) {
      MockMikroTikClient._state = {
        addressLists: new Map(),   // `${listName}:${address}` → entry object
        pppSecrets: new Map(),     // username → { disabled, name, ... }
        pppActive: new Map(),      // username → session object
        hotspotBindings: new Map(), // address → binding object
        hotspotActive: new Map(),   // address → session object
      };
    }
    this.state = MockMikroTikClient._state;
  }

  /**
   * Execute a mock RouterOS command.
   * Supports the command paths used by the provisioning strategies.
   */
  async execute(command, params = {}) {
    logger.debug(`[MOCK RouterOS] ${command}`, { params, device: this.device.name });

    // Simulate a small delay (real router calls take ~20-100ms)
    await new Promise(r => setTimeout(r, 5));

    // ── Address List Commands ──────────────────────────────────────────
    if (command === '/ip/firewall/address-list/add') {
      const key = `${params.list}:${params.address}`;
      const entry = { '.id': `*${Date.now()}`, ...params };
      this.state.addressLists.set(key, entry);
      return entry;
    }

    if (command === '/ip/firewall/address-list/print') {
      const results = [];
      for (const [, entry] of this.state.addressLists) {
        let match = true;
        if (params.list && entry.list !== params.list) match = false;
        if (params.address && entry.address !== params.address) match = false;
        if (match) results.push(entry);
      }
      return results;
    }

    if (command === '/ip/firewall/address-list/remove') {
      const id = params['.id'] || params.id;
      for (const [key, entry] of this.state.addressLists) {
        if (entry['.id'] === id) {
          this.state.addressLists.delete(key);
          return {};
        }
      }
      // Also support removing by list+address (used by our strategy)
      if (params.list && params.address) {
        const key = `${params.list}:${params.address}`;
        this.state.addressLists.delete(key);
        return {};
      }
      return {};
    }

    // ── PPPoE Secret Commands ─────────────────────────────────────────
    if (command === '/ppp/secret/print') {
      const results = [];
      for (const [, secret] of this.state.pppSecrets) {
        let match = true;
        if (params.name && secret.name !== params.name) match = false;
        if (match) results.push(secret);
      }
      return results;
    }

    if (command === '/ppp/secret/set') {
      const name = params.name || params['.id'];
      const existing = this.state.pppSecrets.get(name);
      if (existing) {
        Object.assign(existing, params);
        return existing;
      }
      // Create if doesn't exist
      const entry = { '.id': `*${Date.now()}`, name, ...params };
      this.state.pppSecrets.set(name, entry);
      return entry;
    }

    if (command === '/ppp/secret/disable') {
      const name = params.name || params['.id'];
      const existing = this.state.pppSecrets.get(name);
      if (existing) {
        existing.disabled = 'yes';
        return existing;
      }
      return {};
    }

    if (command === '/ppp/secret/enable') {
      const name = params.name || params['.id'];
      const existing = this.state.pppSecrets.get(name);
      if (existing) {
        existing.disabled = 'no';
        return existing;
      }
      return {};
    }

    // ── PPPoE Active Session Commands ─────────────────────────────────
    if (command === '/ppp/active/print') {
      const results = [];
      for (const [, session] of this.state.pppActive) {
        let match = true;
        if (params.name && session.name !== params.name) match = false;
        if (match) results.push(session);
      }
      return results;
    }

    if (command === '/ppp/active/remove') {
      const id = params['.id'] || params.id || params.name;
      this.state.pppActive.delete(id);
      return {};
    }

    // ── Hotspot IP Binding Commands ───────────────────────────────────
    if (command === '/ip/hotspot/ip-binding/add') {
      const key = params.address || params['mac-address'];
      const entry = { '.id': `*${Date.now()}`, ...params };
      this.state.hotspotBindings.set(key, entry);
      return entry;
    }

    if (command === '/ip/hotspot/ip-binding/print') {
      const results = [];
      for (const [, binding] of this.state.hotspotBindings) {
        let match = true;
        if (params.address && binding.address !== params.address) match = false;
        if (params['mac-address'] && binding['mac-address'] !== params['mac-address']) match = false;
        if (match) results.push(binding);
      }
      return results;
    }

    if (command === '/ip/hotspot/ip-binding/remove') {
      const id = params['.id'] || params.id;
      for (const [key, binding] of this.state.hotspotBindings) {
        if (binding['.id'] === id) {
          this.state.hotspotBindings.delete(key);
          return {};
        }
      }
      if (params.address) {
        this.state.hotspotBindings.delete(params.address);
      }
      return {};
    }

    // ── Hotspot Active Session Commands ───────────────────────────────
    if (command === '/ip/hotspot/active/print') {
      const results = [];
      for (const [, session] of this.state.hotspotActive) {
        let match = true;
        if (params.address && session.address !== params.address) match = false;
        if (match) results.push(session);
      }
      return results;
    }

    if (command === '/ip/hotspot/active/remove') {
      const id = params['.id'] || params.id || params.address;
      this.state.hotspotActive.delete(id);
      return {};
    }

    // ── System Identity (used for connection testing) ─────────────────
    if (command === '/system/identity/print') {
      return [{ name: `Mock-${this.device.name}` }];
    }

    // ── Default: return empty for unknown commands ────────────────────
    logger.debug(`[MOCK RouterOS] Unhandled command: ${command}`);
    return [];
  }

  /**
   * Reset all mock state (call between tests).
   */
  static resetState() {
    MockMikroTikClient._state = null;
  }

  /**
   * Get current mock state for assertions.
   */
  static getState() {
    return MockMikroTikClient._state;
  }
}

module.exports = MockMikroTikClient;
