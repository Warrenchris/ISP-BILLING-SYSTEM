const express = require("express");
const router = express.Router();

// Import controllers
const {
  createSubscription,
  getUserSubscriptions,
  getCurrentSubscription,
  updateSubscription,
  cancelSubscription,
  updateDataUsage,
  getAllSubscriptions,
  changePlan,
  extendSubscription
} = require("../controllers/subscriptionController");

// Import middleware
const { authenticate, authorize } = require("../middleware/auth");
const {
  validateSubscriptionCreation,
  validateSubscriptionUpdate,
  validateDataUsageUpdate,
  validateUUIDParam
} = require("../middleware/planValidation");

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: User subscription management
 */

/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: Create a new subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Subscription created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: "#/components/schemas/Subscription"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 *   get:
 *     summary: Get user's subscriptions
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, suspended, cancelled]
 *         description: Filter by subscription status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of user subscriptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User subscriptions retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptions:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/Subscription"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         currentPage:
 *                           type: integer
 *                         itemsPerPage:
 *                           type: integer
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post("/", 
  authenticate, 
  validateSubscriptionCreation, 
  createSubscription
);
router.get("/", authenticate, getUserSubscriptions);

/**
 * @swagger
 * /subscriptions/current:
 *   get:
 *     summary: Get current active subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current active subscription retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Current active subscription retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: "#/components/schemas/Subscription"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/current", authenticate, getCurrentSubscription);

/**
 * @swagger
 * /subscriptions/all:
 *   get:
 *     summary: Get all subscriptions (Admin or Support only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, suspended, cancelled]
 *         description: Filter by subscription status
 *       - in: query
 *         name: dataPlanId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by data plan ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of all subscriptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: All subscriptions retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptions:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/Subscription"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         currentPage:
 *                           type: integer
 *                         itemsPerPage:
 *                           type: integer
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/all", 
  authenticate, 
  authorize(["admin", "support"]), 
  getAllSubscriptions
);

/**
 * @swagger
 * /subscriptions/{id}:
 *   put:
 *     summary: Update a subscription (Customer - own subscription only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the subscription to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, expired, suspended, cancelled]
 *                 example: "suspended"
 *               autoRenew:
 *                 type: boolean
 *                 example: false
 *               notes:
 *                 type: string
 *                 example: "Customer requested suspension due to travel"
 *     responses:
 *       200:
 *         description: Subscription updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Subscription updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: "#/components/schemas/Subscription"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.put("/:id", 
  authenticate, 
  validateUUIDParam("id"),
  validateSubscriptionUpdate, 
  updateSubscription
);

/**
 * @swagger
 * /subscriptions/{id}/cancel:
 *   put:
 *     summary: Cancel a subscription (Customer - own subscription only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the subscription to cancel
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Subscription cancelled successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: "#/components/schemas/Subscription"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.put("/:id/cancel", 
  authenticate, 
  validateUUIDParam("id"),
  cancelSubscription
);

/**
 * @swagger
 * /subscriptions/{id}/usage:
 *   put:
 *     summary: Update data usage for a subscription (Admin/System only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the subscription to update data usage for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dataUsed
 *             properties:
 *               dataUsed:
 *                 type: integer
 *                 example: 1024000000 # 1 GB in bytes
 *     responses:
 *       200:
 *         description: Data usage updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Data usage updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: "#/components/schemas/Subscription"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.put("/:id/usage", 
  authenticate, 
  authorize(["admin"]), 
  validateUUIDParam("id"),
  validateDataUsageUpdate, 
  updateDataUsage
);

// Admin: change plan for a subscription
router.patch(
  '/admin/subscriptions/:id/plan',
  authenticate,
  authorize(['admin']),
  validateUUIDParam('id'),
  changePlan
);

// Admin: extend a subscription end date
router.patch(
  '/admin/subscriptions/:id/extend',
  authenticate,
  authorize(['admin']),
  validateUUIDParam('id'),
  extendSubscription
);

// Add this before module.exports
/**
 * @swagger
 * /admin/users/{userId}/subscription:
 *   get:
 *     summary: Get user's current subscription (Admin only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the user to get subscription for
 *     responses:
 *       200:
 *         description: User's current subscription retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User subscription retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: "#/components/schemas/Subscription"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get('/admin/users/:userId/subscription', 
  authenticate, 
  authorize(['admin']),
  getCurrentSubscription
);

module.exports = router;


