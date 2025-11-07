/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user/session info to requests
 */

const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

/**
 * Verify JWT token from Authorization header
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.userId = decoded.userId;
    req.sessionId = decoded.sessionId;
    req.userUuid = decoded.userUuid;

    // Optionally verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is malformed or invalid'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please log in again'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
}

/**
 * Verify user belongs to specific session
 */
function requireSession(req, res, next) {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({
      error: 'Session required',
      message: 'Session ID not provided'
    });
  }

  // Check if user's session matches requested session
  if (req.sessionId !== parseInt(sessionId)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this session'
    });
  }

  next();
}

/**
 * Admin authentication (requires admin token)
 * For MVP, we'll use a simple admin secret
 */
function requireAdmin(req, res, next) {
  const adminSecret = req.headers['x-admin-secret'];

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }

  next();
}

/**
 * Optional authentication (doesn't fail if no token)
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.sessionId = decoded.sessionId;
      req.userUuid = decoded.userUuid;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

module.exports = {
  authenticateToken,
  requireSession,
  requireAdmin,
  optionalAuth
};
