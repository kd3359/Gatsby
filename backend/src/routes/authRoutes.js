/**
 * Authentication Routes
 * Handles Instagram OAuth, SMS authentication, and user login
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Instagram OAuth
router.get('/instagram', authController.instagramAuth);
router.get('/instagram/callback', authController.instagramCallback);

// SMS Authentication
router.post('/sms/send-code', authController.sendSMSCode);
router.post('/sms/verify-code', authController.verifySMSCode);

// Session join (via QR code)
router.post('/join/:sessionUuid', authController.joinSession);

// Profile completion (after auth)
router.post('/complete-profile', authenticateToken, authController.completeProfile);

// Verify current session
router.get('/verify', authenticateToken, authController.verifyAuth);

// Logout
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
