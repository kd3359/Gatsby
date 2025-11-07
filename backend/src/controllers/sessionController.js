/**
 * Session Controller
 * Manage venue sessions and QR codes
 */

const prisma = require('../config/database');
const QRCode = require('qrcode');
const { getSessionUserCount } = require('../services/socketService');

/**
 * Create new session
 * POST /api/admin/venues/:venueId/sessions
 */
exports.createSession = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { eventName, startTime, endTime, capacitySoftLimit } = req.body;

    if (!eventName || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Event name, start time, and end time are required'
      });
    }

    // Verify venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: parseInt(venueId) }
    });

    if (!venue) {
      return res.status(404).json({
        error: 'Venue not found'
      });
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        venueId: parseInt(venueId),
        eventName,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'active'
      }
    });

    // Generate QR code URL
    const qrCodeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${session.uuid}`;

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(qrCodeUrl);

    res.status(201).json({
      success: true,
      session: {
        id: session.id,
        uuid: session.uuid,
        venueId: session.venueId,
        eventName: session.eventName,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        qrCodeUrl,
        qrCodeImage,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      error: 'Failed to create session',
      message: error.message
    });
  }
};

/**
 * Get current active sessions (multi-venue overview)
 * GET /api/admin/sessions/current
 */
exports.getCurrentSessions = async (req, res) => {
  try {
    const now = new Date();

    const sessions = await prisma.session.findMany({
      where: {
        status: 'active',
        endTime: {
          gte: now
        }
      },
      include: {
        venue: true,
        _count: {
          select: {
            users: true,
            swipes: true,
            matches: true,
            messages: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Calculate stats for each session
    const sessionsWithStats = await Promise.all(sessions.map(async (session) => {
      const swipes = await prisma.swipe.count({
        where: { sessionId: session.id }
      });

      const likes = await prisma.swipe.count({
        where: { sessionId: session.id, direction: 'like' }
      });

      const matchRate = swipes > 0 ? (session._count.matches / swipes * 100).toFixed(1) : '0.0';
      const timeRemaining = Math.max(0, Math.floor((session.endTime - now) / 60000)); // minutes

      return {
        sessionId: session.id,
        sessionUuid: session.uuid,
        venueName: session.venue.name,
        eventName: session.eventName,
        activeUsers: getSessionUserCount(session.id),
        totalUsers: session._count.users,
        totalSwipes: swipes,
        totalMatches: session._count.matches,
        matchRate: `${matchRate}%`,
        status: session.status,
        timeRemaining: `${Math.floor(timeRemaining / 60)}h ${timeRemaining % 60}m`,
        timeRemainingMinutes: timeRemaining,
        startTime: session.startTime,
        endTime: session.endTime
      };
    }));

    res.json({
      success: true,
      sessions: sessionsWithStats
    });
  } catch (error) {
    console.error('Get current sessions error:', error);
    res.status(500).json({
      error: 'Failed to fetch sessions',
      message: error.message
    });
  }
};

/**
 * Get session by ID
 * GET /api/sessions/:sessionId
 */
exports.getSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        venue: true
      }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      error: 'Failed to fetch session',
      message: error.message
    });
  }
};

/**
 * Update session
 * PUT /api/admin/sessions/:sessionId
 */
exports.updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { eventName, startTime, endTime, status } = req.body;

    const session = await prisma.session.update({
      where: { id: parseInt(sessionId) },
      data: {
        ...(eventName && { eventName }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(status && { status })
      }
    });

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      error: 'Failed to update session',
      message: error.message
    });
  }
};

/**
 * Delete session
 * DELETE /api/admin/sessions/:sessionId
 */
exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    await prisma.session.delete({
      where: { id: parseInt(sessionId) }
    });

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      error: 'Failed to delete session',
      message: error.message
    });
  }
};

/**
 * Generate additional QR code for session
 * POST /api/admin/sessions/:sessionId/qr-codes
 */
exports.generateQRCode = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { location, count } = req.body;

    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    const qrCodeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${session.uuid}`;
    const qrCodesToGenerate = count || 1;
    const qrCodes = [];

    for (let i = 0; i < qrCodesToGenerate; i++) {
      const qrCode = await prisma.qRCode.create({
        data: {
          sessionId: parseInt(sessionId),
          location: location || `location_${i + 1}`
        }
      });

      const qrCodeImage = await QRCode.toDataURL(qrCodeUrl);

      qrCodes.push({
        id: qrCode.id,
        uuid: qrCode.uuid,
        sessionId: qrCode.sessionId,
        location: qrCode.location,
        url: qrCodeUrl,
        image: qrCodeImage,
        scans: qrCode.scans,
        createdAt: qrCode.createdAt
      });
    }

    res.json({
      success: true,
      qrCodes
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({
      error: 'Failed to generate QR code',
      message: error.message
    });
  }
};

/**
 * Get QR codes for session
 * GET /api/admin/sessions/:sessionId/qr-codes
 */
exports.getSessionQRCodes = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    const qrCodes = await prisma.qRCode.findMany({
      where: { sessionId: parseInt(sessionId) },
      orderBy: { createdAt: 'asc' }
    });

    const qrCodeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${session.uuid}`;

    // Generate QR code images
    const qrCodesWithImages = await Promise.all(qrCodes.map(async (qr) => {
      const image = await QRCode.toDataURL(qrCodeUrl);
      return {
        id: qr.id,
        uuid: qr.uuid,
        location: qr.location,
        url: qrCodeUrl,
        image,
        scans: qr.scans,
        createdAt: qr.createdAt
      };
    }));

    res.json({
      success: true,
      sessionId: session.id,
      qrCodes: qrCodesWithImages
    });
  } catch (error) {
    console.error('Get QR codes error:', error);
    res.status(500).json({
      error: 'Failed to fetch QR codes',
      message: error.message
    });
  }
};

/**
 * Get QR code analytics
 * GET /api/admin/sessions/:sessionId/qr-analytics
 */
exports.getQRAnalytics = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const qrCodes = await prisma.qRCode.findMany({
      where: { sessionId: parseInt(sessionId) }
    });

    const totalScans = qrCodes.reduce((sum, qr) => sum + qr.scans, 0);
    const uniqueUsers = await prisma.user.count({
      where: { sessionId: parseInt(sessionId) }
    });

    const scansByLocation = {};
    qrCodes.forEach(qr => {
      scansByLocation[qr.location] = qr.scans;
    });

    res.json({
      success: true,
      totalScans,
      uniqueUsers,
      scansByLocation,
      qrCodes: qrCodes.map(qr => ({
        id: qr.id,
        location: qr.location,
        scans: qr.scans
      }))
    });
  } catch (error) {
    console.error('Get QR analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
};

/**
 * Get session info (for users)
 * GET /api/sessions/:sessionId/info
 */
exports.getSessionInfo = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        venue: true
      }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: {
        uuid: session.uuid,
        eventName: session.eventName,
        venue: {
          name: session.venue.name,
          city: session.venue.city,
          address: session.venue.address
        },
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status
      }
    });
  } catch (error) {
    console.error('Get session info error:', error);
    res.status(500).json({
      error: 'Failed to fetch session info',
      message: error.message
    });
  }
};

/**
 * Get session stats (for users)
 * GET /api/sessions/:sessionId/stats
 */
exports.getSessionStats = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req;

    // Get user's stats
    const swipesGiven = await prisma.swipe.count({
      where: { sessionId: parseInt(sessionId), userId }
    });

    const matches = await prisma.match.count({
      where: {
        sessionId: parseInt(sessionId),
        OR: [{ user1Id: userId }, { user2Id: userId }]
      }
    });

    res.json({
      success: true,
      stats: {
        swipesGiven,
        matches,
        activeUsers: getSessionUserCount(parseInt(sessionId))
      }
    });
  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
};
