/**
 * Contact Routes
 * Handle contact information exchange between matches
 */

const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Share contact with match
router.post('/', contactController.shareContact);

// Get contact info for a match
router.get('/match/:matchId', contactController.getContact);

// Get all exchanged contacts
router.get('/', contactController.getAllContacts);

module.exports = router;
