/**
 * Admin‑only routes
 * -----------------
 *  • All routes require a valid JWT (authenticate)
 *  • Only users with role === 'admin' pass (restrictTo('admin'))
 */
const express = require('express');
const router  = express.Router();
const admin = require('../controllers/adminController');
const dashboardController = require('../controllers/dashboardController');

// ─── Middleware ───────────────────────────────────────────────
const { authenticate, restrictTo } = require('../middleware/auth');

// ─── Controller functions ─────────────────────────────────────
const adminController = require('../controllers/adminController');

// Apply JWT auth + role guard to *everything* below this line
router.use(authenticate, restrictTo('admin'));

// ─── User management ──────────────────────────────────────────
router
  .route('/users')
  .get  (adminController.getAllUsers)   // GET  /api/admin/users
  .post (adminController.createUser);   // POST /api/admin/users

router
  .route('/users/:id')
  .get    (adminController.getUserById)   // GET    /api/admin/users/:id
  .put    (adminController.updateUser)    // PUT    /api/admin/users/:id
  .delete (adminController.deleteUser);

router.get("/users/:userId/subscription", adminController.getUserSubscription);

// ─── System‑wide stats (optional) ─────────────────────────────
router.get('/stats', adminController.getSystemStats); // GET /api/admin/stats
router.patch("/subscriptions/:id", admin.patchSubscription);

// ─── Admin dashboard aggregate endpoints ───────────────────────
router.get('/dashboard/overview', dashboardController.getAdminOverview);
router.get('/dashboard/activity', dashboardController.getAdminActivity);


module.exports = router;
