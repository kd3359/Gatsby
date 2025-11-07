/**
 * Match Routes
 * Handle user matches and connections
 */

const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Get all matches for current user
router.get('/', matchController.getMatches);

// Get specific match details
router.get('/:matchId', matchController.getMatchById);

// Unmatch (future feature)
router.delete('/:matchId', matchController.unmatch);

module.exports = router;
