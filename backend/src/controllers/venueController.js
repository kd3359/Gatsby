/**
 * Venue Controller
 * Manage venue CRUD operations
 */

const prisma = require('../config/database');

/**
 * Create new venue
 * POST /api/admin/venues
 */
exports.createVenue = async (req, res) => {
  try {
    const { name, city, address, latitude, longitude, capacity, timezone } = req.body;

    if (!name || !city) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Venue name and city are required'
      });
    }

    const venue = await prisma.venue.create({
      data: {
        name,
        city,
        address,
        latitude,
        longitude,
        capacity,
        timezone: timezone || 'America/New_York'
      }
    });

    res.status(201).json({
      success: true,
      venue: {
        id: venue.id,
        uuid: venue.uuid,
        name: venue.name,
        city: venue.city,
        address: venue.address,
        capacity: venue.capacity,
        timezone: venue.timezone,
        createdAt: venue.createdAt
      }
    });
  } catch (error) {
    console.error('Create venue error:', error);
    res.status(500).json({
      error: 'Failed to create venue',
      message: error.message
    });
  }
};

/**
 * Get all venues
 * GET /api/venues
 */
exports.getAllVenues = async (req, res) => {
  try {
    const venues = await prisma.venue.findMany({
      include: {
        sessions: {
          where: {
            status: 'active'
          },
          select: {
            id: true,
            uuid: true,
            eventName: true,
            startTime: true,
            endTime: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      venues: venues.map(v => ({
        id: v.id,
        uuid: v.uuid,
        name: v.name,
        city: v.city,
        address: v.address,
        capacity: v.capacity,
        activeSessions: v.sessions
      }))
    });
  } catch (error) {
    console.error('Get venues error:', error);
    res.status(500).json({
      error: 'Failed to fetch venues',
      message: error.message
    });
  }
};

/**
 * Get venue by ID
 * GET /api/venues/:venueId
 */
exports.getVenueById = async (req, res) => {
  try {
    const { venueId } = req.params;

    const venue = await prisma.venue.findUnique({
      where: { id: parseInt(venueId) },
      include: {
        sessions: {
          orderBy: {
            startTime: 'desc'
          },
          take: 10
        }
      }
    });

    if (!venue) {
      return res.status(404).json({
        error: 'Venue not found'
      });
    }

    res.json({
      success: true,
      venue
    });
  } catch (error) {
    console.error('Get venue error:', error);
    res.status(500).json({
      error: 'Failed to fetch venue',
      message: error.message
    });
  }
};

/**
 * Update venue
 * PUT /api/admin/venues/:venueId
 */
exports.updateVenue = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { name, city, address, latitude, longitude, capacity, timezone } = req.body;

    const venue = await prisma.venue.update({
      where: { id: parseInt(venueId) },
      data: {
        ...(name && { name }),
        ...(city && { city }),
        ...(address !== undefined && { address }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(capacity !== undefined && { capacity }),
        ...(timezone && { timezone })
      }
    });

    res.json({
      success: true,
      venue
    });
  } catch (error) {
    console.error('Update venue error:', error);
    res.status(500).json({
      error: 'Failed to update venue',
      message: error.message
    });
  }
};

/**
 * Delete venue
 * DELETE /api/admin/venues/:venueId
 */
exports.deleteVenue = async (req, res) => {
  try {
    const { venueId } = req.params;

    await prisma.venue.delete({
      where: { id: parseInt(venueId) }
    });

    res.json({
      success: true,
      message: 'Venue deleted successfully'
    });
  } catch (error) {
    console.error('Delete venue error:', error);
    res.status(500).json({
      error: 'Failed to delete venue',
      message: error.message
    });
  }
};

/**
 * Get venue sessions
 * GET /api/venues/:venueId/sessions
 */
exports.getVenueSessions = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { status } = req.query;

    const whereClause = {
      venueId: parseInt(venueId),
      ...(status && { status })
    };

    const sessions = await prisma.session.findMany({
      where: whereClause,
      orderBy: {
        startTime: 'desc'
      }
    });

    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Get venue sessions error:', error);
    res.status(500).json({
      error: 'Failed to fetch sessions',
      message: error.message
    });
  }
};
