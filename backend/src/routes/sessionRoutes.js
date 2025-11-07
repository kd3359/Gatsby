/**
 * Session Routes
 * Manage venue sessions and QR codes
 */

const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { requireAdmin, authenticateToken } = require('../middleware/authMiddleware');

// Admin session management
router.post('/', requireAdmin, sessionController.createSession);
router.get('/current', requireAdmin, sessionController.getCurrentSessions);
router.get('/:sessionId', sessionController.getSessionById);
router.put('/:sessionId', requireAdmin, sessionController.updateSession);
router.delete('/:sessionId', requireAdmin, sessionController.deleteSession);

// QR code management
router.get('/:sessionId/qr-codes', requireAdmin, sessionController.getSessionQRCodes);
router.post('/:sessionId/qr-codes', requireAdmin, sessionController.generateQRCode);
router.get('/:sessionId/qr-analytics', requireAdmin, sessionController.getQRAnalytics);

// User-facing endpoints
router.get('/:sessionId/info', authenticateToken, sessionController.getSessionInfo);
router.get('/:sessionId/stats', authenticateToken, sessionController.getSessionStats);

module.exports = router;
