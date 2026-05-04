"use strict";

const { UserRole, UserStatus } = require("../config/constants");

/**
 * GET /api/config/user-statuses
 */
exports.getUserStatuses = (req, res) => {
  res.json({
    success: true,
    data: Object.values(UserStatus),
  });
};

/**
 * GET /api/config/roles
 */
exports.getRoles = (req, res) => {
  res.json({
    success: true,
    data: Object.values(UserRole),
  });
};
