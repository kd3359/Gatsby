/**
 * User Routes
 * Manage user profiles and settings
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Get current user profile
router.get('/me', userController.getCurrentUser);

// Update profile
router.put('/me', userController.updateProfile);

// Upload profile photo
router.post('/me/photo', userController.uploadPhoto);

// Get user by ID (for viewing profiles in swipe stack)
router.get('/:userId', userController.getUserById);

// Get swipe stack (users to swipe on)
router.get('/session/:sessionId/swipe-stack', userController.getSwipeStack);

module.exports = router;
