const express = require("express");
const router = express.Router();

// Import controllers
const {
  getAllDataPlans,
  getDataPlanById,
  createDataPlan,
  updateDataPlan,
  deleteDataPlan,
  getPopularDataPlans,
  getDataPlansByCategory
} = require("../controllers/dataPlanController");

// Import middleware
const { authenticate, authorize } = require("../middleware/auth");
const {
  validateDataPlanCreation,
  validateDataPlanUpdate,
  validateUUIDParam
} = require("../middleware/planValidation");

/**
 * @swagger
 * tags:
 *   name: Data Plans
 *   description: Data plan management and retrieval
 */

/**
 * @swagger
 * /plans:
 *   get:
 *     summary: Get all data plans with filtering and pagination
 *     tags: [Data Plans]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by plan category (e.g., basic, standard, premium)
 *       - in: query
 *         name: planType
 *         schema:
 *           type: string
 *         description: Filter by plan type (e.g., prepaid, postpaid)
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: popular
 *         schema:
 *           type: boolean
 *         description: Filter by popular status
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Filter by minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Filter by maximum price
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
 *         description: List of data plans retrieved successfully
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
 *                   example: Data plans retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     plans:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/DataPlan"
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
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/", getAllDataPlans);

/**
 * @swagger
 * /plans/popular:
 *   get:
 *     summary: Get popular data plans
 *     tags: [Data Plans]
 *     responses:
 *       200:
 *         description: List of popular data plans retrieved successfully
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
 *                   example: Popular data plans retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     plans:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/DataPlan"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/popular", getPopularDataPlans);

/**
 * @swagger
 * /plans/category/{category}:
 *   get:
 *     summary: Get data plans by category
 *     tags: [Data Plans]
 *     parameters:
 *       - in: path
 *         name: category
 *         schema:
 *           type: string
 *           enum: [basic, standard, premium, enterprise]
 *         required: true
 *         description: Category of the data plan
 *     responses:
 *       200:
 *         description: List of data plans by category retrieved successfully
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
 *                   example: Data plans for category basic retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     plans:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/DataPlan"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/category/:category", getDataPlansByCategory);

/**
 * @swagger
 * /plans/{id}:
 *   get:
 *     summary: Get data plan by ID
 *     tags: [Data Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the data plan to retrieve
 *     responses:
 *       200:
 *         description: Data plan retrieved successfully
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
 *                   example: Data plan retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     plan:
 *                       $ref: "#/components/schemas/DataPlan"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/:id", validateUUIDParam("id"), getDataPlanById);

/**
 * @swagger
 * /plans:
 *   post:
 *     summary: Create a new data plan (Admin only)
 *     tags: [Data Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - category
 *               - planType
 *               - dataLimit
 *               - price
 *               - validityDays
 *               - validityPeriod
 *               - speed
 *               - features
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Premium 50GB"
 *               description:
 *                 type: string
 *                 example: "50 GB data for 90 days with high speed"
 *               category:
 *                 type: string
 *                 enum: [basic, standard, premium, enterprise]
 *                 example: "premium"
 *               planType:
 *                 type: string
 *                 enum: [prepaid, postpaid]
 *                 example: "prepaid"
 *               dataLimit:
 *                 type: integer
 *                 example: 53687091200 # 50 GB in bytes
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 5000.00
 *               validityDays:
 *                 type: integer
 *                 example: 90
 *               validityPeriod:
 *                 type: integer
 *                 example: 90
 *               speed:
 *                 type: string
 *                 example: "50 Mbps"
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Unlimited streaming", "24/7 support"]
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               isPopular:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Data plan created successfully
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
 *                   example: Data plan created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     plan:
 *                       $ref: "#/components/schemas/DataPlan"
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
 */
router.post("/", 
  authenticate, 
  authorize(["admin"]), 
  validateDataPlanCreation, 
  createDataPlan
);

/**
 * @swagger
 * /plans/{id}:
 *   put:
 *     summary: Update data plan (Admin only)
 *     tags: [Data Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the data plan to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Premium 50GB Updated"
 *               description:
 *                 type: string
 *                 example: "50 GB data for 90 days with high speed and more features"
 *               category:
 *                 type: string
 *                 enum: [basic, standard, premium, enterprise]
 *                 example: "premium"
 *               planType:
 *                 type: string
 *                 enum: [prepaid, postpaid]
 *                 example: "prepaid"
 *               dataLimit:
 *                 type: integer
 *                 example: 53687091200 # 50 GB in bytes
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 5500.00
 *               validityDays:
 *                 type: integer
 *                 example: 90
 *               validityPeriod:
 *                 type: integer
 *                 example: 90
 *               speed:
 *                 type: string
 *                 example: "60 Mbps"
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Unlimited streaming", "24/7 support", "Gaming boost"]
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               isPopular:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Data plan updated successfully
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
 *                   example: Data plan updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     plan:
 *                       $ref: "#/components/schemas/DataPlan"
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
  authorize(["admin"]), 
  validateUUIDParam("id"),
  validateDataPlanUpdate, 
  updateDataPlan
);

/**
 * @swagger
 * /plans/{id}:
 *   delete:
 *     summary: Delete data plan (Admin only)
 *     tags: [Data Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the data plan to delete
 *     responses:
 *       200:
 *         description: Data plan deleted successfully
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
 *                   example: Data plan deleted successfully
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
router.delete("/:id", 
  authenticate, 
  authorize(["admin"]), 
  validateUUIDParam("id"),
  deleteDataPlan
);

module.exports = router;


