const express = require("express");
const router = express.Router();

const {
  generateInvoice,
  generateInvoicePDF,
  getUserInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  markInvoiceAsPaid,
  generateBulkInvoices,
  getAllInvoices,
  getOverdueInvoices,
  markOverdueInvoices,
  sendPaymentReminders,
  getBillingStatistics
} = require("../controllers/invoiceController");

const { authenticate, authorize } = require("../middleware/auth");
const {
  validateInvoiceGeneration,
  validateInvoiceStatusUpdate,
  validateMarkAsPaid,
  validateBulkInvoiceGeneration,
  validateInvoiceQuery,
  validateInvoiceId,
  validateDateRange,
  checkInvoiceAccess
} = require("../middleware/invoiceValidation");

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoice generation and management
 */

/**
 * @swagger
 * /invoices/my:
 *   get:
 *     summary: Get invoices for the authenticated user
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, overdue, cancelled]
 *         description: Filter by invoice status
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
 *         description: User invoices retrieved successfully
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
 *                   example: Invoices retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoices:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/Invoice"
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
router.get("/my", validateInvoiceQuery, getUserInvoices);

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: Get invoice by ID for the authenticated user
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the invoice to retrieve
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
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
 *                   example: Invoice retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoice:
 *                       $ref: "#/components/schemas/Invoice"
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
router.get("/:id", validateInvoiceId, getInvoiceById);

/**
 * @swagger
 * /invoices/generate/{subscriptionId}:
 *   post:
 *     summary: Generate an invoice for a specific subscription (Admin only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the subscription to generate an invoice for
 *     responses:
 *       201:
 *         description: Invoice generated successfully
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
 *                   example: Invoice generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoice:
 *                       $ref: "#/components/schemas/Invoice"
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
router.post("/generate/:subscriptionId", validateInvoiceGeneration, generateInvoice);

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: Get all invoices (Admin only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, overdue, cancelled]
 *         description: Filter by invoice status
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: subscriptionId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by subscription ID
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
 *         description: All invoices retrieved successfully
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
 *                   example: All invoices retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoices:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/Invoice"
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
router.get("/", authorize(["admin"]), validateInvoiceQuery, getAllInvoices);

/**
 * @swagger
 * /invoices/overdue/list:
 *   get:
 *     summary: Get all overdue invoices (Admin only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue invoices retrieved successfully
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
 *                   example: Overdue invoices retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoices:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/Invoice"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/overdue/list", authorize(["admin"]), getOverdueInvoices);

/**
 * @swagger
 * /invoices/statistics/billing:
 *   get:
 *     summary: Get billing statistics (Admin only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Billing statistics retrieved successfully
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
 *                   example: Billing statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalInvoices:
 *                       type: integer
 *                       example: 100
 *                     totalAmountBilled:
 *                       type: number
 *                       format: float
 *                       example: 150000.00
 *                     paidInvoices:
 *                       type: integer
 *                       example: 80
 *                     pendingInvoices:
 *                       type: integer
 *                       example: 20
 *                     overdueInvoices:
 *                       type: integer
 *                       example: 5
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/statistics/billing", authorize(["admin"]), validateDateRange, getBillingStatistics);

/**
 * @swagger
 * /invoices/bulk/generate:
 *   post:
 *     summary: Generate invoices in bulk (Admin only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: List of user IDs to generate invoices for. If empty, generates for all active subscriptions.
 *     responses:
 *       200:
 *         description: Bulk invoice generation initiated successfully
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
 *                   example: Bulk invoice generation initiated
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post("/bulk/generate", authorize(["admin"]), validateBulkInvoiceGeneration, generateBulkInvoices);

/**
 * @swagger
 * /invoices/overdue/mark:
 *   post:
 *     summary: Mark invoices as overdue (Admin only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invoices marked as overdue successfully
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
 *                   example: Overdue invoices marked successfully
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post("/overdue/mark", authorize(["admin"]), markOverdueInvoices);

/**
 * @swagger
 * /invoices/reminders/send:
 *   post:
 *     summary: Send payment reminders for overdue invoices (Admin only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment reminders sent successfully
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
 *                   example: Payment reminders sent successfully
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post("/reminders/send", authorize(["admin"]), sendPaymentReminders);

/**
 * @swagger
 * /invoices/{id}/status:
 *   put:
 *     summary: Update invoice status (Admin only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the invoice to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, paid, overdue, cancelled]
 *                 example: "paid"
 *     responses:
 *       200:
 *         description: Invoice status updated successfully
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
 *                   example: Invoice status updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoice:
 *                       $ref: "#/components/schemas/Invoice"
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
router.put("/:id/status", authorize(["admin"]), validateInvoiceStatusUpdate, updateInvoiceStatus);

/**
 * @swagger
 * /invoices/{id}/paid:
 *   put:
 *     summary: Mark invoice as paid (Admin only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the invoice to mark as paid
 *     responses:
 *       200:
 *         description: Invoice marked as paid successfully
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
 *                   example: Invoice marked as paid successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoice:
 *                       $ref: "#/components/schemas/Invoice"
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
router.put("/:id/paid", authorize(["admin"]), validateMarkAsPaid, markInvoiceAsPaid);

router.get('/:invoiceId/pdf', authenticate, authorize(['admin', 'support', 'customer']), generateInvoicePDF);

module.exports = router;


