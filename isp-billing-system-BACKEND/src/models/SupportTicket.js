const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupportTicket = sequelize.define('SupportTicket', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id'
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'low'
    },
    status: {
        type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
        defaultValue: 'open'
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    assignedTo: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'assigned_to'
    }
}, {
    tableName: 'support_tickets',
    timestamps: true,
    underscored: true
});

module.exports = SupportTicket;
