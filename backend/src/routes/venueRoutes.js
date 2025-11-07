/**
 * Venue Routes
 * Manage venues and their sessions
 */

const express = require('express');
const router = express.Router();
const venueController = require('../controllers/venueController');
const { requireAdmin } = require('../middleware/authMiddleware');

// Admin-only routes for venue management
router.post('/', requireAdmin, venueController.createVenue);
router.get('/', venueController.getAllVenues);
router.get('/:venueId', venueController.getVenueById);
router.put('/:venueId', requireAdmin, venueController.updateVenue);
router.delete('/:venueId', requireAdmin, venueController.deleteVenue);

// Get venue sessions
router.get('/:venueId/sessions', venueController.getVenueSessions);

module.exports = router;
