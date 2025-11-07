/**
 * Message Routes
 * Handle chat messages between matches
 */

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Get messages for a match
router.get('/match/:matchId', messageController.getMessages);

// Send message (HTTP fallback - primarily use Socket.IO)
router.post('/', messageController.sendMessage);

// Mark message as read
router.put('/:messageId/read', messageController.markAsRead);

// Delete message
router.delete('/:messageId', messageController.deleteMessage);

module.exports = router;
