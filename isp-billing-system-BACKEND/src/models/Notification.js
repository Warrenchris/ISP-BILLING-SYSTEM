const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
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
    type: {
        type: DataTypes.ENUM('info', 'warning', 'success', 'error', 'system'),
        defaultValue: 'info'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_read'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true
});

module.exports = Notification;
