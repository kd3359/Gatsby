/**
 * Socket.IO Service - Real-time Communication
 * Handles matches, messages, typing indicators, and session events
 */

const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

// Store active users by session
const activeSessions = new Map(); // sessionId -> Set of socket.id
const userSockets = new Map(); // userId -> socket.id
const socketUsers = new Map(); // socket.id -> { userId, sessionId }

/**
 * Initialize Socket.IO with authentication and event handlers
 */
function initializeSocket(io) {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.sessionId = decoded.sessionId;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, sessionId } = socket;

    console.log(`✅ User ${userId} connected to session ${sessionId}`);

    // Track user connection
    userSockets.set(userId, socket.id);
    socketUsers.set(socket.id, { userId, sessionId });

    // Join session-specific room
    const roomName = `session_${sessionId}`;
    socket.join(roomName);

    // Track active users in session
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, new Set());
    }
    activeSessions.get(sessionId).add(socket.id);

    // Broadcast updated user count to session
    const userCount = activeSessions.get(sessionId).size;
    io.to(roomName).emit('user_count_updated', { count: userCount });

    // ==========================================
    // SWIPE EVENTS
    // ==========================================

    socket.on('swipe', async (data) => {
      try {
        const { targetUserId, direction } = data;

        // Create swipe record
        await prisma.swipe.create({
          data: {
            sessionId,
            userId,
            targetUserId,
            direction
          }
        });

        // If it's a "like", check for mutual match
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
            // Create match!
            const match = await prisma.match.create({
              data: {
                sessionId,
                user1Id: Math.min(userId, targetUserId),
                user2Id: Math.max(userId, targetUserId)
              },
              include: {
                user1: true,
                user2: true
              }
            });

            // Emit match notification to both users
            const targetSocketId = userSockets.get(targetUserId);

            socket.emit('new_match', {
              matchId: match.id,
              user: {
                id: match.user2.id,
                uuid: match.user2.uuid,
                name: match.user2.name,
                age: match.user2.age,
                profilePhotoUrl: match.user2.profilePhotoUrl,
                bio: match.user2.bio,
                vibeTags: match.user2.vibeTags,
                followerCount: match.user2.followerCount,
                verified: match.user2.verified
              }
            });

            if (targetSocketId) {
              io.to(targetSocketId).emit('new_match', {
                matchId: match.id,
                user: {
                  id: match.user1.id,
                  uuid: match.user1.uuid,
                  name: match.user1.name,
                  age: match.user1.age,
                  profilePhotoUrl: match.user1.profilePhotoUrl,
                  bio: match.user1.bio,
                  vibeTags: match.user1.vibeTags,
                  followerCount: match.user1.followerCount,
                  verified: match.user1.verified
                }
              });
            }

            console.log(`💚 Match created: User ${userId} ↔ User ${targetUserId}`);
          }
        }

        socket.emit('swipe_recorded', { success: true });
      } catch (error) {
        console.error('Swipe error:', error);
        socket.emit('swipe_error', { error: error.message });
      }
    });

    // ==========================================
    // MESSAGE EVENTS
    // ==========================================

    socket.on('send_message', async (data) => {
      try {
        const { matchId, receiverId, content } = data;

        // Verify match exists and user is part of it
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
          return socket.emit('message_error', { error: 'Match not found' });
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

        // Send message to receiver
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('new_message', {
            messageId: message.id,
            matchId: message.matchId,
            sender: message.sender,
            content: message.content,
            createdAt: message.createdAt
          });
        }

        // Confirm to sender
        socket.emit('message_sent', {
          messageId: message.id,
          matchId: message.matchId,
          content: message.content,
          createdAt: message.createdAt
        });

        console.log(`💬 Message sent: User ${userId} → User ${receiverId}`);
      } catch (error) {
        console.error('Message error:', error);
        socket.emit('message_error', { error: error.message });
      }
    });

    socket.on('typing_start', (data) => {
      const { receiverId } = data;
      const receiverSocketId = userSockets.get(receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user_typing', { userId });
      }
    });

    socket.on('typing_stop', (data) => {
      const { receiverId } = data;
      const receiverSocketId = userSockets.get(receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user_stopped_typing', { userId });
      }
    });

    socket.on('mark_message_read', async (data) => {
      try {
        const { messageId } = data;

        await prisma.message.updateMany({
          where: {
            id: messageId,
            receiverId: userId,
            readAt: null
          },
          data: {
            readAt: new Date()
          }
        });

        socket.emit('message_read_confirmed', { messageId });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // ==========================================
    // CONTACT EXCHANGE EVENTS
    // ==========================================

    socket.on('share_contact', async (data) => {
      try {
        const { matchId, receiverId, phone, instagram } = data;

        // Verify match
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
          return socket.emit('contact_error', { error: 'Match not found' });
        }

        // Check if contact exchange already exists
        let contact = await prisma.contact.findFirst({
          where: {
            matchId,
            sessionId
          }
        });

        if (!contact) {
          // Create new contact record
          contact = await prisma.contact.create({
            data: {
              sessionId,
              matchId,
              user1Id: match.user1Id,
              user2Id: match.user2Id
            }
          });
        }

        // Update with sender's contact info
        const updateData = userId === match.user1Id
          ? { user1Phone: phone, user1Instagram: instagram }
          : { user2Phone: phone, user2Instagram: instagram };

        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: updateData
        });

        // Notify receiver
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('contact_shared', {
            matchId,
            userId,
            phone,
            instagram
          });
        }

        socket.emit('contact_shared_confirmed', { success: true });

        console.log(`📱 Contact shared: User ${userId} → User ${receiverId}`);
      } catch (error) {
        console.error('Contact share error:', error);
        socket.emit('contact_error', { error: error.message });
      }
    });

    // ==========================================
    // SESSION EVENTS
    // ==========================================

    socket.on('ping', () => {
      socket.emit('pong');
    });

    // ==========================================
    // DISCONNECT
    // ==========================================

    socket.on('disconnect', () => {
      console.log(`❌ User ${userId} disconnected from session ${sessionId}`);

      // Remove from tracking
      userSockets.delete(userId);
      socketUsers.delete(socket.id);

      if (activeSessions.has(sessionId)) {
        activeSessions.get(sessionId).delete(socket.id);

        // Broadcast updated user count
        const userCount = activeSessions.get(sessionId).size;
        io.to(roomName).emit('user_count_updated', { count: userCount });

        // Clean up empty sessions
        if (activeSessions.get(sessionId).size === 0) {
          activeSessions.delete(sessionId);
        }
      }
    });
  });

  // Session management utilities
  setInterval(() => {
    // Check for expired sessions every 5 minutes
    checkExpiredSessions(io);
  }, 5 * 60 * 1000);

  console.log('✅ Socket.IO service initialized');
}

/**
 * Check for expired sessions and notify users
 */
async function checkExpiredSessions(io) {
  try {
    const now = new Date();

    // Find sessions ending in 30 minutes
    const endingSoon = await prisma.session.findMany({
      where: {
        status: 'active',
        endTime: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 60 * 1000)
        }
      }
    });

    endingSoon.forEach((session) => {
      const roomName = `session_${session.id}`;
      const minutesRemaining = Math.floor((session.endTime - now) / 60000);

      io.to(roomName).emit('session_ending_soon', {
        minutesRemaining,
        message: `Party ending in ${minutesRemaining} minutes! Exchange contact info now.`
      });
    });

    // Find expired sessions
    const expired = await prisma.session.findMany({
      where: {
        status: 'active',
        endTime: {
          lte: now
        }
      }
    });

    for (const session of expired) {
      const roomName = `session_${session.id}`;

      // Notify all users
      io.to(roomName).emit('session_ended', {
        message: "Party's over! Your matches will disappear in 24 hours."
      });

      // Update session status
      await prisma.session.update({
        where: { id: session.id },
        data: { status: 'ended' }
      });

      console.log(`🌙 Session ${session.id} ended`);
    }
  } catch (error) {
    console.error('Session check error:', error);
  }
}

/**
 * Emit event to specific user
 */
function emitToUser(userId, event, data) {
  const socketId = userSockets.get(userId);
  if (socketId) {
    const io = require('../server').io;
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
}

/**
 * Emit event to entire session
 */
function emitToSession(sessionId, event, data) {
  const io = require('../server').io;
  const roomName = `session_${sessionId}`;
  io.to(roomName).emit(event, data);
}

/**
 * Get active user count for session
 */
function getSessionUserCount(sessionId) {
  return activeSessions.get(sessionId)?.size || 0;
}

module.exports = {
  initializeSocket,
  emitToUser,
  emitToSession,
  getSessionUserCount
};
