/**
 * Contact Controller
 * Handle contact information exchange
 */

const prisma = require('../config/database');

/**
 * Share contact with match
 * POST /api/contacts
 */
exports.shareContact = async (req, res) => {
  try {
    const { userId, sessionId } = req;
    const { matchId, phone, instagram } = req.body;

    if (!matchId) {
      return res.status(400).json({
        error: 'Match ID required'
      });
    }

    // Verify match exists
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
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

    res.json({
      success: true,
      message: 'Contact shared successfully',
      contact: {
        phone,
        instagram
      }
    });
  } catch (error) {
    console.error('Share contact error:', error);
    res.status(500).json({
      error: 'Failed to share contact',
      message: error.message
    });
  }
};

/**
 * Get contact info for a match
 * GET /api/contacts/match/:matchId
 */
exports.getContact = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { userId, sessionId } = req;

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

    // Get contact info
    const contact = await prisma.contact.findFirst({
      where: {
        matchId: parseInt(matchId),
        sessionId
      }
    });

    if (!contact) {
      return res.status(404).json({
        error: 'No contact information shared yet'
      });
    }

    // Return the other user's contact info
    const otherUserContact = userId === match.user1Id
      ? { phone: contact.user2Phone, instagram: contact.user2Instagram }
      : { phone: contact.user1Phone, instagram: contact.user1Instagram };

    res.json({
      success: true,
      contact: otherUserContact
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      error: 'Failed to fetch contact',
      message: error.message
    });
  }
};

/**
 * Get all exchanged contacts
 * GET /api/contacts
 */
exports.getAllContacts = async (req, res) => {
  try {
    const { userId, sessionId } = req;

    // Get all matches for user
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
            profilePhotoUrl: true
          }
        },
        user2: {
          select: {
            id: true,
            uuid: true,
            name: true,
            profilePhotoUrl: true
          }
        },
        contacts: true
      }
    });

    // Filter matches with exchanged contacts
    const contactsExchanged = matches
      .filter(match => match.contacts.length > 0)
      .map(match => {
        const contact = match.contacts[0];
        const otherUser = match.user1Id === userId ? match.user2 : match.user1;
        const otherUserContact = userId === match.user1Id
          ? { phone: contact.user2Phone, instagram: contact.user2Instagram }
          : { phone: contact.user1Phone, instagram: contact.user1Instagram };

        return {
          matchId: match.id,
          user: otherUser,
          contact: otherUserContact,
          sharedAt: contact.sharedAt
        };
      });

    res.json({
      success: true,
      contacts: contactsExchanged
    });
  } catch (error) {
    console.error('Get all contacts error:', error);
    res.status(500).json({
      error: 'Failed to fetch contacts',
      message: error.message
    });
  }
};
