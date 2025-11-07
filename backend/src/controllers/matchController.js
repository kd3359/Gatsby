/**
 * Match Controller
 * Handle matches and connections
 */

const prisma = require('../config/database');

/**
 * Get all matches for current user
 * GET /api/matches
 */
exports.getMatches = async (req, res) => {
  try {
    const { userId, sessionId } = req;

    const matches = await prisma.match.findMany({
      where: {
        sessionId,
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
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
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        matchedAt: 'desc'
      }
    });

    // Format matches with the other user's info
    const formattedMatches = matches.map(match => {
      const otherUser = match.user1Id === userId ? match.user2 : match.user1;
      const lastMessage = match.messages[0] || null;

      return {
        matchId: match.id,
        matchedAt: match.matchedAt,
        user: otherUser,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt,
          readAt: lastMessage.readAt
        } : null
      };
    });

    res.json({
      success: true,
      matches: formattedMatches
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      error: 'Failed to fetch matches',
      message: error.message
    });
  }
};

/**
 * Get specific match details
 * GET /api/matches/:matchId
 */
exports.getMatchById = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { userId, sessionId } = req;

    const match = await prisma.match.findFirst({
      where: {
        id: parseInt(matchId),
        sessionId,
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
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

    if (!match) {
      return res.status(404).json({
        error: 'Match not found'
      });
    }

    const otherUser = match.user1Id === userId ? match.user2 : match.user1;

    res.json({
      success: true,
      match: {
        id: match.id,
        matchedAt: match.matchedAt,
        user: otherUser
      }
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({
      error: 'Failed to fetch match',
      message: error.message
    });
  }
};

/**
 * Unmatch (future feature)
 * DELETE /api/matches/:matchId
 */
exports.unmatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { userId, sessionId } = req;

    // Verify match belongs to user
    const match = await prisma.match.findFirst({
      where: {
        id: parseInt(matchId),
        sessionId,
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      }
    });

    if (!match) {
      return res.status(404).json({
        error: 'Match not found'
      });
    }

    // Delete match and associated messages
    await prisma.match.delete({
      where: { id: parseInt(matchId) }
    });

    res.json({
      success: true,
      message: 'Unmatched successfully'
    });
  } catch (error) {
    console.error('Unmatch error:', error);
    res.status(500).json({
      error: 'Failed to unmatch',
      message: error.message
    });
  }
};
