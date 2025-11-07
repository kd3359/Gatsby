/**
 * User Controller
 * Manage user profiles and swipe stack
 */

const prisma = require('../config/database');

/**
 * Get current user profile
 * GET /api/users/me
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const { user } = req;

    res.json({
      success: true,
      user: {
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        age: user.age,
        profilePhotoUrl: user.profilePhotoUrl,
        bio: user.bio,
        vibeTags: user.vibeTags,
        authProvider: user.authProvider,
        followerCount: user.followerCount,
        verified: user.verified,
        sessionId: user.sessionId
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error.message
    });
  }
};

/**
 * Update user profile
 * PUT /api/users/me
 */
exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req;
    const { name, age, bio, vibeTags, profilePhotoUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(age && { age }),
        ...(bio !== undefined && { bio }),
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
        profilePhotoUrl: user.profilePhotoUrl,
        bio: user.bio,
        vibeTags: user.vibeTags
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
};

/**
 * Upload profile photo
 * POST /api/users/me/photo
 */
exports.uploadPhoto = async (req, res) => {
  try {
    const { userId } = req;
    const { photoUrl } = req.body;

    if (!photoUrl) {
      return res.status(400).json({
        error: 'Photo URL required'
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePhotoUrl: photoUrl }
    });

    res.json({
      success: true,
      profilePhotoUrl: user.profilePhotoUrl
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      error: 'Failed to upload photo',
      message: error.message
    });
  }
};

/**
 * Get user by ID
 * GET /api/users/:userId
 */
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessionId } = req;

    const user = await prisma.user.findFirst({
      where: {
        id: parseInt(userId),
        sessionId // Ensure user is in same session
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Return public profile info only
    res.json({
      success: true,
      user: {
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        age: user.age,
        profilePhotoUrl: user.profilePhotoUrl,
        bio: user.bio,
        vibeTags: user.vibeTags,
        followerCount: user.followerCount,
        verified: user.verified
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error.message
    });
  }
};

/**
 * Get swipe stack (users to swipe on)
 * GET /api/users/session/:sessionId/swipe-stack
 */
exports.getSwipeStack = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req;

    // Get users already swiped on
    const swipedUserIds = await prisma.swipe.findMany({
      where: {
        sessionId: parseInt(sessionId),
        userId
      },
      select: { targetUserId: true }
    });

    const swipedIds = swipedUserIds.map(s => s.targetUserId);

    // Get users in session excluding:
    // - Current user
    // - Already swiped users
    const users = await prisma.user.findMany({
      where: {
        sessionId: parseInt(sessionId),
        id: {
          not: userId,
          notIn: swipedIds
        }
      },
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
      },
      take: 50 // Limit to 50 profiles at a time
    });

    // Randomize order for fairness
    const shuffled = users.sort(() => Math.random() - 0.5);

    res.json({
      success: true,
      users: shuffled
    });
  } catch (error) {
    console.error('Get swipe stack error:', error);
    res.status(500).json({
      error: 'Failed to fetch swipe stack',
      message: error.message
    });
  }
};
