/**
 * JWT Utility Functions
 * Generate and verify JWT tokens for authentication
 */

const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for authenticated user
 * @param {Object} user - User object from database
 * @param {number} sessionId - Session ID
 * @returns {string} JWT token
 */
function generateToken(user, sessionId) {
  const payload = {
    userId: user.id,
    userUuid: user.uuid,
    sessionId: sessionId,
    authProvider: user.authProvider
  };

  // Token expires when session ends (or 24 hours, whichever is sooner)
  const expiresIn = '24h';

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
    issuer: 'gatsby-app'
  });
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Generate refresh token (for future use)
 * @param {Object} user - User object
 * @returns {string} Refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    userId: user.id,
    userUuid: user.uuid,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'gatsby-app'
  });
}

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken
};
