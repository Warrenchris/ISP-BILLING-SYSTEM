const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true, // Nullable for system actions or unauthenticated attempts
        field: 'user_id'
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    details: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ip: {
        type: DataTypes.STRING,
        allowNull: true
    },
    resourceType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'resource_type'
    },
    resourceId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'resource_id'
    }
}, {
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true
});

module.exports = AuditLog;
