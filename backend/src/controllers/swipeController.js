/**
 * Swipe Controller
 * Handle swiping logic (HTTP fallback - Socket.IO is primary)
 */

const prisma = require('../config/database');

/**
 * Record a swipe
 * POST /api/swipes
 */
exports.recordSwipe = async (req, res) => {
  try {
    const { userId, sessionId } = req;
    const { targetUserId, direction } = req.body;

    if (!targetUserId || !direction) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Target user ID and direction required'
      });
    }

    if (!['like', 'pass'].includes(direction)) {
      return res.status(400).json({
        error: 'Invalid direction',
        message: 'Direction must be "like" or "pass"'
      });
    }

    // Check if already swiped
    const existingSwipe = await prisma.swipe.findFirst({
      where: {
        sessionId,
        userId,
        targetUserId
      }
    });

    if (existingSwipe) {
      return res.status(400).json({
        error: 'Already swiped',
        message: 'You have already swiped on this user'
      });
    }

    // Create swipe
    const swipe = await prisma.swipe.create({
      data: {
        sessionId,
        userId,
        targetUserId,
        direction
      }
    });

    // Check for match if it's a like
    let match = null;
    if (direction === 'like') {
      const mutualSwipe = await prisma.swipe.findFirst({
        where: {
          sessionId,
          userId: targetUserId,
          targetUserId: userId,
          direction: 'like'
        }
      });

      if (mutualSwipe) {
        // Create match
        match = await prisma.match.create({
          data: {
            sessionId,
            user1Id: Math.min(userId, targetUserId),
            user2Id: Math.max(userId, targetUserId)
          },
          include: {
            user1: {
              select: {
                id: true,
                uuid: true,
                name: true,
                age: true,
                profilePhotoUrl: true,
                bio: true,
                vibeTags: true,
                followerCount: true,
                verified: true
              }
            },
            user2: {
              select: {
                id: true,
                uuid: true,
                name: true,
                age: true,
                profilePhotoUrl: true,
                bio: true,
                vibeTags: true,
                followerCount: true,
                verified: true
              }
            }
          }
        });
      }
    }

    res.json({
      success: true,
      swipe: {
        id: swipe.id,
        direction: swipe.direction,
        createdAt: swipe.createdAt
      },
      ...(match && {
        match: {
          id: match.id,
          matchedUser: userId === match.user1Id ? match.user2 : match.user1
        }
      })
    });
  } catch (error) {
    console.error('Record swipe error:', error);
    res.status(500).json({
      error: 'Failed to record swipe',
      message: error.message
    });
  }
};

/**
 * Get swipe history
 * GET /api/swipes/history
 */
exports.getSwipeHistory = async (req, res) => {
  try {
    const { userId, sessionId } = req;

    const swipes = await prisma.swipe.findMany({
      where: {
        sessionId,
        userId
      },
      include: {
        targetUser: {
          select: {
            id: true,
            uuid: true,
            name: true,
            age: true,
            profilePhotoUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    res.json({
      success: true,
      swipes: swipes.map(s => ({
        id: s.id,
        direction: s.direction,
        targetUser: s.targetUser,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    console.error('Get swipe history error:', error);
    res.status(500).json({
      error: 'Failed to fetch swipe history',
      message: error.message
    });
  }
};

/**
 * Undo last swipe (limit to 3 per session)
 * POST /api/swipes/undo
 */
exports.undoSwipe = async (req, res) => {
  try {
    const { userId, sessionId } = req;

    // Get last swipe
    const lastSwipe = await prisma.swipe.findFirst({
      where: {
        sessionId,
        userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!lastSwipe) {
      return res.status(404).json({
        error: 'No swipes to undo'
      });
    }

    // Delete the swipe
    await prisma.swipe.delete({
      where: { id: lastSwipe.id }
    });

    // If it was a match, delete the match too
    if (lastSwipe.direction === 'like') {
      await prisma.match.deleteMany({
        where: {
          sessionId,
          OR: [
            { user1Id: userId, user2Id: lastSwipe.targetUserId },
            { user1Id: lastSwipe.targetUserId, user2Id: userId }
          ]
        }
      });
    }

    res.json({
      success: true,
      message: 'Swipe undone successfully',
      undoneSwipe: {
        targetUserId: lastSwipe.targetUserId,
        direction: lastSwipe.direction
      }
    });
  } catch (error) {
    console.error('Undo swipe error:', error);
    res.status(500).json({
      error: 'Failed to undo swipe',
      message: error.message
    });
  }
};
