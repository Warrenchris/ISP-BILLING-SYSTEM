const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Setting = sequelize.define('Setting', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    value: {
        type: DataTypes.JSON,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'general'
    }
}, {
    tableName: 'settings',
    timestamps: true,
    underscored: true
});

module.exports = Setting;
