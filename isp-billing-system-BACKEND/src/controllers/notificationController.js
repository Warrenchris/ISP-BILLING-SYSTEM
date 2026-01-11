const { Notification } = require('../models');

exports.getNotifications = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, isRead } = req.query;
        const where = { userId: req.user.id };

        if (isRead !== undefined) {
            where.isRead = isRead === 'true';
        }

        const offset = (page - 1) * limit;

        const { rows, count } = await Notification.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
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

exports.markAsRead = async (req, res, next) => {
    try {
        const notification = await Notification.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        notification.isRead = true;
        await notification.save();

        res.json({ success: true, data: notification });
    } catch (error) {
        next(error);
    }
};

exports.deleteNotification = async (req, res, next) => {
    try {
        const result = await Notification.destroy({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!result) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        next(error);
    }
};

// Admin: Get all system notifications (logs)
exports.getAllSystemNotifications = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const { rows, count } = await Notification.findAndCountAll({
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        next(error);
    }
}
