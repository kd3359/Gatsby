/**
 * Admin Routes
 * Administrative dashboard and analytics
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const venueController = require('../controllers/venueController');
const sessionController = require('../controllers/sessionController');
const { requireAdmin } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(requireAdmin);

// Venue management (delegated to venue controller)
router.post('/venues', venueController.createVenue);
router.get('/venues', venueController.getAllVenues);
router.get('/venues/:venueId', venueController.getVenueById);
router.put('/venues/:venueId', venueController.updateVenue);
router.delete('/venues/:venueId', venueController.deleteVenue);

// Session management
router.post('/venues/:venueId/sessions', sessionController.createSession);
router.get('/sessions/current', sessionController.getCurrentSessions);
router.get('/venues/:venueId/sessions', venueController.getVenueSessions);
router.get('/venues/:venueId/sessions/:sessionId/analytics', adminController.getSessionAnalytics);

// QR code management
router.get('/venues/:venueId/sessions/:sessionId/qr-codes', sessionController.getSessionQRCodes);
router.post('/venues/:venueId/sessions/:sessionId/qr-codes', sessionController.generateQRCode);
router.get('/venues/:venueId/sessions/:sessionId/qr-analytics', sessionController.getQRAnalytics);

// Analytics
router.get('/dashboard', adminController.getDashboardOverview);
router.get('/analytics/sessions/:sessionId', adminController.getSessionAnalytics);
router.get('/analytics/users', adminController.getUserAnalytics);

module.exports = router;
