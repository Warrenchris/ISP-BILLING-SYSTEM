/**
 * SMS Controller
 *
 * Admin operations for templates configuration, delivery auditing,
 * and cost tracking statistics.
 */

const { SmsLog, SmsTemplate, sequelize } = require('../models');
const logger = require('../config/logger');

/**
 * GET /api/admin/sms/logs
 * List paginated SMS logs with phone, tag, and status filters.
 */
const listLogs = async (req, res) => {
  try {
    const { phone, tag, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (phone) where.recipientPhone = phone;
    if (tag) where.tag = tag;
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const logs = await SmsLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: logs.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(logs.count / parseInt(limit)),
        totalItems: logs.count,
      },
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Failed to fetch SMS logs' });
  }
};

/**
 * GET /api/admin/sms/stats
 * Accumulate overall outbound SMS metrics and billing spend (KES)
 * directly from the sms_logs table.
 */
const getStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run direct query for counts and costs
    const [stats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_sent,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        COALESCE(SUM(cost), 0.00) as total_cost_kes,
        SUM(CASE WHEN created_at >= :startOfMonth THEN 1 ELSE 0 END) as sent_this_month,
        COALESCE(SUM(CASE WHEN created_at >= :startOfMonth THEN cost ELSE 0 END), 0.00) as cost_this_month_kes
      FROM sms_logs
    `, {
      replacements: { startOfMonth },
    });

    const metrics = stats[0] || {
      total_sent: 0,
      success_count: 0,
      failed_count: 0,
      total_cost_kes: 0.00,
      sent_this_month: 0,
      cost_this_month_kes: 0.00,
    };

    res.json({
      success: true,
      data: {
        totalSent: parseInt(metrics.total_sent),
        successCount: parseInt(metrics.success_count),
        failedCount: parseInt(metrics.failed_count),
        totalCostKes: parseFloat(metrics.total_cost_kes),
        sentThisMonth: parseInt(metrics.sent_this_month),
        costThisMonthKes: parseFloat(metrics.cost_this_month_kes),
      },
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Failed to calculate SMS stats' });
  }
};

/**
 * GET /api/admin/sms/templates
 * List all registered message templates.
 */
const listTemplates = async (req, res) => {
  try {
    const templates = await SmsTemplate.findAll({
      order: [['key', 'ASC']],
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
};

/**
 * PUT /api/admin/sms/templates/:key
 * Update an SMS template text string.
 */
const updateTemplate = async (req, res) => {
  try {
    const { key } = req.params;
    const { template } = req.body;

    if (!template) {
      return res.status(400).json({ success: false, message: 'Template content is required' });
    }

    const item = await SmsTemplate.findOne({ where: { key } });
    if (!item) {
      return res.status(404).json({ success: false, message: `Template "${key}" not found` });
    }

    await item.update({ template });

    logger.info(`SMS template "${key}" updated by admin`, { key });

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: item,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Failed to update template' });
  }
};

module.exports = {
  listLogs,
  getStats,
  listTemplates,
  updateTemplate,
};
