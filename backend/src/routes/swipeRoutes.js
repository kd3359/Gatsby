/**
 * Swipe Routes
 * Handle swiping and matching
 */

const express = require('express');
const router = express.Router();
const swipeController = require('../controllers/swipeController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Record a swipe (handled via Socket.IO primarily, but HTTP fallback)
router.post('/', swipeController.recordSwipe);

// Get swipe history
router.get('/history', swipeController.getSwipeHistory);

// Undo last swipe
router.post('/undo', swipeController.undoSwipe);

module.exports = router;
