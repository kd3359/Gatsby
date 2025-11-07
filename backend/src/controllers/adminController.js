/**
 * Admin Controller
 * Analytics dashboard and administrative functions
 */

const prisma = require('../config/database');
const { getSessionUserCount } = require('../services/socketService');

/**
 * Get dashboard overview (multi-venue)
 * GET /api/admin/dashboard
 */
exports.getDashboardOverview = async (req, res) => {
  try {
    const now = new Date();

    // Get all active sessions
    const activeSessions = await prisma.session.findMany({
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
      }
    });

    // Calculate stats for each session
    const sessionStats = await Promise.all(activeSessions.map(async (session) => {
      const swipes = session._count.swipes;
      const matches = session._count.matches;
      const matchRate = swipes > 0 ? ((matches / swipes) * 100).toFixed(1) : '0.0';
      const timeRemaining = Math.max(0, Math.floor((session.endTime - now) / 60000));

      return {
        sessionId: session.id,
        sessionUuid: session.uuid,
        venueName: session.venue.name,
        eventName: session.eventName,
        activeUsers: getSessionUserCount(session.id),
        totalUsers: session._count.users,
        totalSwipes: swipes,
        totalMatches: matches,
        totalMessages: session._count.messages,
        matchRate: `${matchRate}%`,
        status: session.status,
        timeRemainingMinutes: timeRemaining,
        startTime: session.startTime,
        endTime: session.endTime
      };
    }));

    // Calculate totals
    const totals = sessionStats.reduce((acc, session) => ({
      totalUsers: acc.totalUsers + session.totalUsers,
      totalActiveUsers: acc.totalActiveUsers + session.activeUsers,
      totalSwipes: acc.totalSwipes + session.totalSwipes,
      totalMatches: acc.totalMatches + session.totalMatches,
      totalMessages: acc.totalMessages + session.totalMessages
    }), {
      totalUsers: 0,
      totalActiveUsers: 0,
      totalSwipes: 0,
      totalMatches: 0,
      totalMessages: 0
    });

    const avgMatchRate = totals.totalSwipes > 0
      ? ((totals.totalMatches / totals.totalSwipes) * 100).toFixed(1)
      : '0.0';

    res.json({
      success: true,
      overview: {
        activeSessions: sessionStats.length,
        totals: {
          ...totals,
          avgMatchRate: `${avgMatchRate}%`
        }
      },
      sessions: sessionStats
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard',
      message: error.message
    });
  }
};

/**
 * Get detailed session analytics
 * GET /api/admin/analytics/sessions/:sessionId
 */
exports.getSessionAnalytics = async (req, res) => {
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

    // Get counts
    const userCount = await prisma.user.count({
      where: { sessionId: parseInt(sessionId) }
    });

    const swipeCount = await prisma.swipe.count({
      where: { sessionId: parseInt(sessionId) }
    });

    const likeCount = await prisma.swipe.count({
      where: { sessionId: parseInt(sessionId), direction: 'like' }
    });

    const matchCount = await prisma.match.count({
      where: { sessionId: parseInt(sessionId) }
    });

    const messageCount = await prisma.message.count({
      where: { sessionId: parseInt(sessionId) }
    });

    const contactCount = await prisma.contact.count({
      where: { sessionId: parseInt(sessionId) }
    });

    // Calculate metrics
    const matchRate = swipeCount > 0 ? (matchCount / swipeCount) : 0;
    const avgSwipesPerUser = userCount > 0 ? (swipeCount / userCount) : 0;
    const avgMatchesPerUser = userCount > 0 ? (matchCount / userCount) : 0;
    const chatInitiationRate = matchCount > 0 ? (messageCount > 0 ? 1 : 0) : 0;
    const contactExchangeRate = matchCount > 0 ? (contactCount / matchCount) : 0;

    // Get timeline data (hourly breakdown)
    const timeline = await getSessionTimeline(parseInt(sessionId), session.startTime);

    // Get top profiles
    const topProfiles = await getTopProfiles(parseInt(sessionId));

    const now = new Date();
    const timeRemaining = Math.max(0, Math.floor((session.endTime - now) / 60000));

    res.json({
      success: true,
      session: {
        id: session.id,
        uuid: session.uuid,
        venueName: session.venue.name,
        eventName: session.eventName,
        status: session.status,
        timeRemaining: `${Math.floor(timeRemaining / 60)}h ${timeRemaining % 60}m`
      },
      realTime: {
        activeUsers: getSessionUserCount(parseInt(sessionId)),
        swipingNow: Math.floor(getSessionUserCount(parseInt(sessionId)) * 0.5), // Estimate
        chattingNow: Math.floor(getSessionUserCount(parseInt(sessionId)) * 0.2) // Estimate
      },
      cumulative: {
        totalUsersEver: userCount,
        totalSwipes: swipeCount,
        totalLikes: likeCount,
        totalMatches: matchCount,
        totalMessages: messageCount,
        totalContactsShared: contactCount
      },
      metrics: {
        matchRate: (matchRate * 100).toFixed(1) + '%',
        avgSwipesPerUser: avgSwipesPerUser.toFixed(2),
        avgMatchesPerUser: avgMatchesPerUser.toFixed(2),
        chatInitiationRate: (chatInitiationRate * 100).toFixed(1) + '%',
        contactExchangeRate: (contactExchangeRate * 100).toFixed(1) + '%'
      },
      timeline,
      topProfiles
    });
  } catch (error) {
    console.error('Get session analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
};

/**
 * Get user analytics
 * GET /api/admin/analytics/users
 */
exports.getUserAnalytics = async (req, res) => {
  try {
    const { sessionId } = req.query;

    const whereClause = sessionId ? { sessionId: parseInt(sessionId) } : {};

    const totalUsers = await prisma.user.count({ where: whereClause });

    const authProviders = await prisma.user.groupBy({
      by: ['authProvider'],
      where: whereClause,
      _count: true
    });

    const avgAge = await prisma.user.aggregate({
      where: whereClause,
      _avg: {
        age: true
      }
    });

    res.json({
      success: true,
      analytics: {
        totalUsers,
        avgAge: avgAge._avg.age?.toFixed(1) || 'N/A',
        authProviders: authProviders.map(p => ({
          provider: p.authProvider,
          count: p._count
        }))
      }
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch user analytics',
      message: error.message
    });
  }
};

/**
 * Helper: Get session timeline (hourly breakdown)
 */
async function getSessionTimeline(sessionId, startTime) {
  // Get all users for this session with their creation times
  const users = await prisma.user.findMany({
    where: { sessionId },
    select: { createdAt: true }
  });

  const swipes = await prisma.swipe.findMany({
    where: { sessionId },
    select: { createdAt: true }
  });

  const matches = await prisma.match.findMany({
    where: { sessionId },
    select: { matchedAt: true }
  });

  // Group by hour
  const timeline = [];
  const start = new Date(startTime);
  const now = new Date();

  for (let hour = 0; hour < 12; hour++) { // Max 12 hours
    const hourStart = new Date(start.getTime() + hour * 60 * 60 * 1000);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    if (hourStart > now) break;

    const userCount = users.filter(u => u.createdAt >= hourStart && u.createdAt < hourEnd).length;
    const swipeCount = swipes.filter(s => s.createdAt >= hourStart && s.createdAt < hourEnd).length;
    const matchCount = matches.filter(m => m.matchedAt >= hourStart && m.matchedAt < hourEnd).length;

    timeline.push({
      time: hourStart.toISOString().substring(11, 16), // HH:MM
      users: userCount,
      swipes: swipeCount,
      matches: matchCount
    });
  }

  return timeline;
}

/**
 * Helper: Get top profiles (most swiped right)
 */
async function getTopProfiles(sessionId) {
  const topSwipedUsers = await prisma.swipe.groupBy({
    by: ['targetUserId'],
    where: {
      sessionId,
      direction: 'like'
    },
    _count: true,
    orderBy: {
      _count: {
        targetUserId: 'desc'
      }
    },
    take: 10
  });

  const topUsers = await Promise.all(topSwipedUsers.map(async (item) => {
    const user = await prisma.user.findUnique({
      where: { id: item.targetUserId },
      select: {
        id: true,
        uuid: true,
        name: true,
        age: true,
        profilePhotoUrl: true
      }
    });

    const matchCount = await prisma.match.count({
      where: {
        sessionId,
        OR: [
          { user1Id: item.targetUserId },
          { user2Id: item.targetUserId }
        ]
      }
    });

    return {
      user,
      swipesReceived: item._count,
      matches: matchCount
    };
  }));

  return topUsers;
}
