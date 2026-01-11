const { Payment, Subscription, User } = require('../models');
const { Op } = require('sequelize');
const { PaymentStatus, SubscriptionStatus } = require('../config/constants');

exports.getRevenueStats = async (req, res, next) => {
    try {
        const { period = 'monthly' } = req.query; // monthly, yearly

        // Simple aggregation: Revenue per month for the last 12 months
        const now = new Date();
        const startDate = new Date();
        startDate.setMonth(now.getMonth() - 11);
        startDate.setDate(1); // Start of 12 months ago

        const payments = await Payment.findAll({
            where: {
                status: PaymentStatus.COMPLETED,
                createdAt: { [Op.gte]: startDate }
            },
            attributes: ['amount', 'createdAt']
        });

        // Group by month
        const revenueByMonth = {};
        payments.forEach(p => {
            const month = new Date(p.createdAt).toLocaleString('default', { month: 'short' });
            revenueByMonth[month] = (revenueByMonth[month] || 0) + parseFloat(p.amount);
        });

        // Format for Recharts
        const data = Object.keys(revenueByMonth).map(month => ({
            name: month,
            revenue: revenueByMonth[month]
        }));

        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.getSubscriberGrowth = async (req, res, next) => {
    try {
        const { period = 'monthly' } = req.query;

        // Group users by creation date (last 6 months)
        const now = new Date();
        const startDate = new Date();
        startDate.setMonth(now.getMonth() - 6);

        const users = await User.findAll({
            where: { createdAt: { [Op.gte]: startDate } },
            attributes: ['createdAt', 'status']
        });

        const growthMap = {};
        const months = [];

        // Initialize months
        for (let i = 0; i < 6; i++) {
            const d = new Date(startDate);
            d.setMonth(startDate.getMonth() + i);
            const m = d.toLocaleString('default', { month: 'short' });
            months.push(m);
            growthMap[m] = { name: m, newUsers: 0, active: 0 };
        }

        // Simple count of new users per month
        users.forEach(u => {
            const m = new Date(u.createdAt).toLocaleString('default', { month: 'short' });
            if (growthMap[m]) {
                growthMap[m].newUsers++;
                if (u.status === 'active') growthMap[m].active++;
            }
        });

        res.json({ success: true, data: Object.values(growthMap) });
    } catch (error) {
        next(error);
    }
};
