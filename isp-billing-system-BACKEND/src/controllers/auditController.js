const { AuditLog, User } = require('../models');

exports.getAllLogs = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, action, userId } = req.query;
        const where = {};

        if (action) where.action = action;
        if (userId) where.userId = userId;

        const offset = (page - 1) * limit;

        const { rows, count } = await AuditLog.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }
            ]
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.getLogById = async (req, res, next) => {
    try {
        const log = await AuditLog.findByPk(req.params.id, {
            include: [{ model: User, as: 'User', attributes: ['firstName', 'lastName'] }]
        });
        if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
        res.json({ success: true, data: log });
    } catch (error) {
        next(error);
    }
};

// Helper to create log (internal use)
exports.createLog = async (data) => {
    try {
        await AuditLog.create(data);
    } catch (err) {
        console.error('Failed to create audit log:', err);
    }
};
