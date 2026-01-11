const { SupportTicket, User } = require('../models');
const { Op } = require('sequelize');

exports.getAllTickets = async (req, res, next) => {
    try {
        const { status, priority, page = 1, limit = 10, userId } = req.query;
        const where = {};

        if (status) where.status = status;
        if (priority) where.priority = priority;

        // If user is not admin/support, restrict to their own tickets
        if (req.user.role === 'customer' || userId) {
            where.userId = userId || req.user.id;
        }

        const offset = (page - 1) * limit;

        const { rows, count } = await SupportTicket.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'Staff', attributes: ['id', 'firstName', 'lastName'] } // Assigned staff
            ]
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.getTicketById = async (req, res, next) => {
    try {
        const ticket = await SupportTicket.findByPk(req.params.id, {
            include: [
                { model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email'] }
            ]
        });

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        // Access control
        if (req.user.role === 'customer' && ticket.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: ticket });
    } catch (error) {
        next(error);
    }
};

exports.createTicket = async (req, res, next) => {
    try {
        const { subject, description, priority, category } = req.body;

        const ticket = await SupportTicket.create({
            userId: req.user.id,
            subject,
            description,
            priority: priority || 'low',
            category: category || 'general',
            status: 'open'
        });

        res.status(201).json({ success: true, data: ticket });
    } catch (error) {
        next(error);
    }
};

exports.updateTicket = async (req, res, next) => {
    try {
        const { status, priority, assignedTo } = req.body;
        const ticket = await SupportTicket.findByPk(req.params.id);

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        // Only admin/support can update arbitrary fields
        // Customers might maintain 'closed' status updates if logic permits, but usually confined to replies/closing
        if (status) ticket.status = status;
        if (priority) ticket.priority = priority;
        if (assignedTo) ticket.assignedTo = assignedTo;

        await ticket.save();

        res.json({ success: true, data: ticket });
    } catch (error) {
        next(error);
    }
};

exports.closeTicket = async (req, res, next) => {
    try {
        const ticket = await SupportTicket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        if (req.user.role === 'customer' && ticket.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        ticket.status = 'closed';
        await ticket.save();

        res.json({ success: true, message: 'Ticket closed' });
    } catch (error) {
        next(error);
    }
};
