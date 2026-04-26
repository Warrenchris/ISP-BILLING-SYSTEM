const { SupportTicket, User } = require('../models');
const { Op } = require('sequelize');

/* ─── Static config ────────────────────────────────────────────────────────── */

const CATEGORIES = [
    { value: 'technical', label: 'Technical',  icon: 'NetworkCheck' },
    { value: 'billing',   label: 'Billing',    icon: 'Payment'      },
    { value: 'sales',     label: 'Sales',      icon: 'ShoppingCart' },
    { value: 'general',   label: 'General',    icon: 'Help'         },
];

const PRIORITIES = [
    { value: 'low',      label: 'Low'      },
    { value: 'medium',   label: 'Medium'   },
    { value: 'high',     label: 'High'     },
    { value: 'critical', label: 'Critical' },
];

const STATUSES = [
    { value: 'open',        label: 'Open'        },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved',    label: 'Resolved'    },
    { value: 'closed',      label: 'Closed'      },
];

const LABELS_CONFIG = {
    statuses: {
        open:        { color: 'info',    hex: '#0ea5e9' },
        in_progress: { color: 'warning', hex: '#f59e0b' },
        resolved:    { color: 'success', hex: '#22c55e' },
        closed:      { color: 'default', hex: '#6b7280' },
    },
    priorities: {
        low:      { color: 'success', hex: '#22c55e' },
        medium:   { color: 'warning', hex: '#f59e0b' },
        high:     { color: 'error',   hex: '#ef4444' },
        critical: { color: 'error',   hex: '#dc2626' },
    },
};

/* ─── Helper: compute allowed actions per ticket ───────────────────────────── */
function computeAllowedActions(ticket, userRole) {
    const actions = ['view'];
    const isStaff = userRole === 'admin' || userRole === 'support';

    if (isStaff) {
        if (ticket.status !== 'closed') {
            actions.push('edit');
            actions.push('assign');
        }
        if (ticket.status === 'open') actions.push('in_progress');
        if (ticket.status === 'in_progress') actions.push('resolve');
        if (ticket.status !== 'closed') actions.push('close');
        actions.push('delete');
    } else {
        // Customer can only close their own open/in_progress tickets
        if (ticket.status !== 'closed' && ticket.status !== 'resolved') {
            actions.push('close');
        }
    }

    return actions;
}

/* ─── Controllers ──────────────────────────────────────────────────────────── */

/* GET /api/support/tickets?search=&status=&priority=&category=&assignedTo=&page=&limit= */
exports.getAllTickets = async (req, res, next) => {
    try {
        const {
            status, priority, category, assignedTo,
            search = '',
            page = 1,
            limit = 20,
        } = req.query;

        const where = {};

        if (status)     where.status   = status;
        if (priority)   where.priority = priority;
        if (category)   where.category = category;
        if (assignedTo) where.assignedTo = assignedTo;

        // Customers only see their own tickets
        if (req.user.role === 'customer') {
            where.userId = req.user.id;
        }

        // Full-text search across subject
        if (search) {
            where.subject = { [Op.like]: `%${search}%` };
        }

        const offset = (page - 1) * limit;

        const { rows, count } = await SupportTicket.findAndCountAll({
            where,
            limit:  parseInt(limit),
            offset: parseInt(offset),
            order:  [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'User',  attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'Staff', attributes: ['id', 'firstName', 'lastName'] },
            ],
        });

        // Augment each row with allowedActions
        const data = rows.map(row => {
            const json = row.toJSON();
            json.allowedActions = computeAllowedActions(json, req.user.role);
            // Build a user-friendly customerName
            if (json.User) {
                json.customerName = `${json.User.firstName} ${json.User.lastName}`;
            }
            return json;
        });

        res.json({
            success: true,
            data,
            pagination: {
                page:  parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit),
            },
        });
    } catch (error) {
        next(error);
    }
};

/* GET /api/support/tickets/:id */
exports.getTicketById = async (req, res, next) => {
    try {
        const ticket = await SupportTicket.findByPk(req.params.id, {
            include: [
                { model: User, as: 'User',  attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'Staff', attributes: ['id', 'firstName', 'lastName'] },
            ],
        });

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        if (req.user.role === 'customer' && ticket.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const json = ticket.toJSON();
        json.allowedActions = computeAllowedActions(json, req.user.role);

        res.json({ success: true, data: json });
    } catch (error) {
        next(error);
    }
};

/* POST /api/support/tickets */
exports.createTicket = async (req, res, next) => {
    try {
        const { subject, description, priority, category } = req.body;

        const ticket = await SupportTicket.create({
            userId:      req.user.id,
            subject,
            description,
            priority:    priority  || 'low',
            category:    category  || 'general',
            status:      'open',
        });

        res.status(201).json({ success: true, data: ticket });
    } catch (error) {
        next(error);
    }
};

/* PUT /api/support/tickets/:id */
exports.updateTicket = async (req, res, next) => {
    try {
        const { status, priority, assignedTo } = req.body;
        const ticket = await SupportTicket.findByPk(req.params.id);

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        if (status)     ticket.status     = status;
        if (priority)   ticket.priority   = priority;
        if (assignedTo !== undefined) ticket.assignedTo = assignedTo;

        await ticket.save();
        res.json({ success: true, data: ticket });
    } catch (error) {
        next(error);
    }
};

/* PUT /api/support/tickets/:id/close */
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

/* PUT /api/support/tickets/:id/assign */
exports.assignTicket = async (req, res, next) => {
    try {
        const { staffId } = req.body;
        const ticket = await SupportTicket.findByPk(req.params.id);

        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        // Verify the target user exists and is staff
        if (staffId) {
            const staff = await User.findOne({
                where: { id: staffId, role: { [Op.in]: ['admin', 'support'] } },
            });
            if (!staff) return res.status(400).json({ success: false, message: 'Invalid staff member' });
        }

        ticket.assignedTo = staffId || null;
        await ticket.save();

        const updated = await SupportTicket.findByPk(ticket.id, {
            include: [
                { model: User, as: 'User',  attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'Staff', attributes: ['id', 'firstName', 'lastName'] },
            ],
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

/* DELETE /api/support/tickets/:id  (admin/support only) */
exports.deleteTicket = async (req, res, next) => {
    try {
        const ticket = await SupportTicket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        await ticket.destroy();
        res.json({ success: true, message: 'Ticket deleted' });
    } catch (error) {
        next(error);
    }
};

/* ─── Config/Metadata endpoints ─────────────────────────────────────────────── */

/* GET /api/support/tickets/categories */
exports.getCategories = (req, res) => {
    res.json({ success: true, data: CATEGORIES });
};

/* GET /api/support/tickets/priorities */
exports.getPriorities = (req, res) => {
    res.json({ success: true, data: PRIORITIES });
};

/* GET /api/support/tickets/statuses */
exports.getStatuses = (req, res) => {
    res.json({ success: true, data: STATUSES });
};

/* GET /api/support/tickets/labels-config */
exports.getLabelsConfig = (req, res) => {
    res.json({ success: true, data: LABELS_CONFIG });
};

/* GET /api/support/tickets/staff  — returns admin + support users for assignment */
exports.getStaff = async (req, res, next) => {
    try {
        const staff = await User.findAll({
            where: {
                role:     { [Op.in]: ['admin', 'support'] },
                isActive: true,
            },
            attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
            order: [['firstName', 'ASC']],
        });
        res.json({ success: true, data: staff });
    } catch (error) {
        next(error);
    }
};
