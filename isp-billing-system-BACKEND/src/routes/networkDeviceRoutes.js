/**
 * Network Device Routes
 *
 * Admin-only CRUD for managing MikroTik routers + audit log viewer.
 * All routes require authentication + admin role.
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  testConnection,
  getRouterLogs,
} = require('../controllers/networkDeviceController');

// All routes are admin-only
router.use(authenticate, authorize(['admin']));

// GET    /api/admin/network-devices          — List all routers
router.get('/', getAllDevices);

// POST   /api/admin/network-devices          — Add a router
router.post('/', createDevice);

// GET    /api/admin/network-devices/logs      — Query command audit logs
// (placed before /:id to avoid matching 'logs' as an ID)
router.get('/logs', getRouterLogs);

// PUT    /api/admin/network-devices/:id       — Update a router
router.put('/:id', updateDevice);

// DELETE /api/admin/network-devices/:id       — Soft-delete a router
router.delete('/:id', deleteDevice);

// POST   /api/admin/network-devices/:id/test  — Test connection to a router
router.post('/:id/test', testConnection);

module.exports = router;
