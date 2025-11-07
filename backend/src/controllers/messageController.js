/**
 * Message Controller
 * Handle chat messages (HTTP fallback - Socket.IO is primary)
 */

const prisma = require('../config/database');

/**
 * Get messages for a match
 * GET /api/messages/match/:matchId
 */
exports.getMessages = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { userId, sessionId } = req;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user is part of the match
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

    const messages = await prisma.message.findMany({
      where: {
        matchId: parseInt(matchId),
        sessionId,
        deletedAt: null
      },
      include: {
        sender: {
          select: {
            id: true,
            uuid: true,
            name: true,
            profilePhotoUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    // Mark unread messages as read
    await prisma.message.updateMany({
      where: {
        matchId: parseInt(matchId),
        receiverId: userId,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    res.json({
      success: true,
      messages: messages.reverse().map(m => ({
        id: m.id,
        content: m.content,
        sender: m.sender,
        createdAt: m.createdAt,
        readAt: m.readAt
      }))
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: 'Failed to fetch messages',
      message: error.message
    });
  }
};

/**
 * Send message (HTTP fallback)
 * POST /api/messages
 */
exports.sendMessage = async (req, res) => {
  try {
    const { userId, sessionId } = req;
    const { matchId, receiverId, content } = req.body;

    if (!matchId || !receiverId || !content) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Match ID, receiver ID, and content required'
      });
    }

    // Verify match exists
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        sessionId,
        OR: [
          { user1Id: userId, user2Id: receiverId },
          { user1Id: receiverId, user2Id: userId }
        ]
      }
    });

    if (!match) {
      return res.status(404).json({
        error: 'Match not found'
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        sessionId,
        matchId,
        senderId: userId,
        receiverId,
        content
      },
      include: {
        sender: {
          select: {
            id: true,
            uuid: true,
            name: true,
            profilePhotoUrl: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        sender: message.sender,
        createdAt: message.createdAt
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message
    });
  }
};

/**
 * Mark message as read
 * PUT /api/messages/:messageId/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req;

    const message = await prisma.message.updateMany({
      where: {
        id: parseInt(messageId),
        receiverId: userId,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    if (message.count === 0) {
      return res.status(404).json({
        error: 'Message not found or already read'
      });
    }

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      error: 'Failed to mark message as read',
      message: error.message
    });
  }
};

/**
 * Delete message
 * DELETE /api/messages/:messageId
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req;

    // Verify message belongs to user and is less than 1 hour old
    const message = await prisma.message.findFirst({
      where: {
        id: parseInt(messageId),
        senderId: userId
      }
    });

    if (!message) {
      return res.status(404).json({
        error: 'Message not found'
      });
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (message.createdAt < hourAgo) {
      return res.status(400).json({
        error: 'Cannot delete',
        message: 'Messages can only be deleted within 1 hour'
      });
    }

    // Soft delete
    await prisma.message.update({
      where: { id: parseInt(messageId) },
      data: {
        deletedAt: new Date(),
        content: '[Message deleted]'
      }
    });

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      error: 'Failed to delete message',
      message: error.message
    });
  }
};
