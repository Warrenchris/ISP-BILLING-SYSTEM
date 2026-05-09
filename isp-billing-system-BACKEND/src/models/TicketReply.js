const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TicketReply = sequelize.define('TicketReply', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ticketId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'ticket_id'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isInternal: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_internal'
  }
}, {
  tableName: 'ticket_replies',
  timestamps: true,
  underscored: true
});

module.exports = TicketReply;

