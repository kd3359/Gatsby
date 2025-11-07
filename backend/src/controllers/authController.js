/**
 * Authentication Controller
 * Handles Instagram OAuth, SMS verification, and user session management
 */

const prisma = require('../config/database');
const { generateToken } = require('../utils/jwtUtils');
const { sendSMS, verifySMSCode: verifyTwilioCode } = require('../services/smsService');
const { getInstagramProfile } = require('../services/instagramService');
const crypto = require('crypto');

// Temporary storage for SMS verification codes (in production, use Redis)
const smsVerificationCodes = new Map();

/**
 * Instagram OAuth - Initiate
 * GET /api/auth/instagram
 */
exports.instagramAuth = (req, res) => {
  const { sessionUuid } = req.query;

  if (!sessionUuid) {
    return res.status(400).json({
      error: 'Session required',
      message: 'Session UUID must be provided'
    });
  }

  // Store session UUID in state parameter for callback
  const state = Buffer.from(JSON.stringify({ sessionUuid })).toString('base64');

  const instagramAuthUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${process.env.INSTAGRAM_REDIRECT_URI}&scope=user_profile,user_media&response_type=code&state=${state}`;

  res.json({ authUrl: instagramAuthUrl });
};

/**
 * Instagram OAuth - Callback
 * GET /api/auth/instagram/callback
 */
exports.instagramCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        error: 'Authorization failed',
        message: 'No authorization code received'
      });
    }

    // Decode state to get session UUID
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { sessionUuid } = stateData;

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
        code
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res.status(400).json({
        error: 'Token exchange failed',
        message: 'Could not obtain access token'
      });
    }

    // Get Instagram profile
    const profile = await getInstagramProfile(tokenData.access_token);

    // Find session
    const session = await prisma.session.findUnique({
      where: { uuid: sessionUuid }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Invalid or expired session'
      });
    }

    // Check if session is active
    if (session.status !== 'active' || new Date() > session.endTime) {
      return res.status(400).json({
        error: 'Session expired',
        message: 'This event has ended'
      });
    }

    // Check if user already exists in this session
    let user = await prisma.user.findFirst({
      where: {
        sessionId: session.id,
        authProvider: 'instagram',
        providerId: profile.id
      }
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          sessionId: session.id,
          authProvider: 'instagram',
          providerId: profile.id,
          name: profile.username,
          age: 18, // Default, will be updated in profile completion
          profilePhotoUrl: profile.profile_picture_url,
          bio: profile.bio || '',
          followerCount: profile.followers_count,
          verified: profile.is_verified || false,
          vibeTags: []
        }
      });
    }

    // Generate JWT token
    const token = generateToken(user, session.id);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&needsProfile=${!user.vibeTags || user.vibeTags.length === 0}`);
  } catch (error) {
    console.error('Instagram callback error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
};

/**
 * Send SMS verification code
 * POST /api/auth/sms/send-code
 */
exports.sendSMSCode = async (req, res) => {
  try {
    const { phoneNumber, sessionUuid } = req.body;

    if (!phoneNumber || !sessionUuid) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Phone number and session UUID required'
      });
    }

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { uuid: sessionUuid }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code with expiration (5 minutes)
    const verificationId = crypto.randomBytes(16).toString('hex');
    smsVerificationCodes.set(verificationId, {
      phoneNumber,
      code,
      sessionUuid,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    // Send SMS
    await sendSMS(phoneNumber, `Your Gatsby verification code is: ${code}`);

    res.json({
      success: true,
      verificationId,
      message: 'Verification code sent'
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({
      error: 'Failed to send code',
      message: error.message
    });
  }
};

/**
 * Verify SMS code and create/login user
 * POST /api/auth/sms/verify-code
 */
exports.verifySMSCode = async (req, res) => {
  try {
    const { verificationId, code } = req.body;

    if (!verificationId || !code) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Verification ID and code required'
      });
    }

    // Get stored verification data
    const verification = smsVerificationCodes.get(verificationId);

    if (!verification) {
      return res.status(400).json({
        error: 'Invalid verification',
        message: 'Verification not found or expired'
      });
    }

    // Check expiration
    if (Date.now() > verification.expiresAt) {
      smsVerificationCodes.delete(verificationId);
      return res.status(400).json({
        error: 'Code expired',
        message: 'Please request a new code'
      });
    }

    // Verify code
    if (verification.code !== code) {
      return res.status(400).json({
        error: 'Invalid code',
        message: 'Incorrect verification code'
      });
    }

    // Code is valid, remove from storage
    smsVerificationCodes.delete(verificationId);

    // Find session
    const session = await prisma.session.findUnique({
      where: { uuid: verification.sessionUuid }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    // Hash phone number for storage
    const hashedPhone = crypto
      .createHash('sha256')
      .update(verification.phoneNumber)
      .digest('hex');

    // Check if user exists
    let user = await prisma.user.findFirst({
      where: {
        sessionId: session.id,
        authProvider: 'sms',
        providerId: hashedPhone
      }
    });

    if (!user) {
      // Create new user (minimal profile)
      user = await prisma.user.create({
        data: {
          sessionId: session.id,
          authProvider: 'sms',
          providerId: hashedPhone,
          name: 'User', // Will be updated in profile completion
          age: 18, // Will be updated
          vibeTags: []
        }
      });
    }

    // Generate token
    const token = generateToken(user, session.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        needsProfile: !user.profilePhotoUrl || user.vibeTags.length === 0
      }
    });
  } catch (error) {
    console.error('Verify SMS error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: error.message
    });
  }
};

/**
 * Join session via QR code
 * POST /api/auth/join/:sessionUuid
 */
exports.joinSession = async (req, res) => {
  try {
    const { sessionUuid } = req.params;

    // Find session
    const session = await prisma.session.findUnique({
      where: { uuid: sessionUuid },
      include: {
        venue: true
      }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Invalid QR code or session'
      });
    }

    // Check if session is active
    const now = new Date();
    if (session.status !== 'active' || now > session.endTime) {
      return res.status(400).json({
        error: 'Session expired',
        message: 'This event has ended'
      });
    }

    if (now < session.startTime) {
      return res.status(400).json({
        error: 'Session not started',
        message: 'This event has not started yet'
      });
    }

    // Return session info
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
        endTime: session.endTime
      }
    });
  } catch (error) {
    console.error('Join session error:', error);
    res.status(500).json({
      error: 'Failed to join session',
      message: error.message
    });
  }
};

/**
 * Complete user profile after authentication
 * POST /api/auth/complete-profile
 */
exports.completeProfile = async (req, res) => {
  try {
    const { userId } = req;
    const { name, age, bio, vibeTags, profilePhotoUrl } = req.body;

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(age && { age }),
        ...(bio && { bio }),
        ...(vibeTags && { vibeTags }),
        ...(profilePhotoUrl && { profilePhotoUrl })
      }
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        age: user.age,
        bio: user.bio,
        vibeTags: user.vibeTags,
        profilePhotoUrl: user.profilePhotoUrl
      }
    });
  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
};

/**
 * Verify current authentication
 * GET /api/auth/verify
 */
exports.verifyAuth = async (req, res) => {
  try {
    const { user } = req;

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        age: user.age,
        profilePhotoUrl: user.profilePhotoUrl,
        bio: user.bio,
        vibeTags: user.vibeTags,
        sessionId: user.sessionId
      }
    });
  } catch (error) {
    console.error('Verify auth error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: error.message
    });
  }
};

/**
 * Logout
 * POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  // For JWT, logout is handled client-side by removing token
  // In future, implement token blacklist with Redis
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};
