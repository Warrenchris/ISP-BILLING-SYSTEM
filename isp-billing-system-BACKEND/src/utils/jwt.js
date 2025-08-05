const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for user
 * @param {Object} payload - User data to include in token
 * @returns {String} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'isp-billing-system',
    audience: 'isp-customers'
  });
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'isp-billing-system',
      audience: 'isp-customers'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Decode JWT token without verification (for debugging)
 * @param {String} token - JWT token to decode
 * @returns {Object} Decoded token
 */
const decodeToken = (token) => {
  return jwt.decode(token, { complete: true });
};

/**
 * Generate refresh token
 * @param {Object} payload - User data to include in token
 * @returns {String} Refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '30d',
    issuer: 'isp-billing-system',
    audience: 'isp-customers'
  });
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateRefreshToken
};

