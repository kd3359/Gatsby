/**
 * Instagram Service
 * Handles Instagram API interactions
 */

/**
 * Get Instagram profile using access token
 * @param {string} accessToken - Instagram access token
 * @returns {Object} User profile data
 */
async function getInstagramProfile(accessToken) {
  try {
    // Get basic profile info
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Instagram profile');
    }

    const data = await response.json();

    // For MVP, we'll use mock follower count and verification
    // In production, you'd need Instagram Business API for this data
    return {
      id: data.id,
      username: data.username,
      account_type: data.account_type,
      media_count: data.media_count,
      profile_picture_url: `https://graph.instagram.com/${data.id}/picture?access_token=${accessToken}`,
      bio: '', // Not available in basic API
      followers_count: null, // Requires Business API
      is_verified: false // Requires Business API
    };
  } catch (error) {
    console.error('Instagram profile fetch error:', error);
    throw new Error(`Failed to get Instagram profile: ${error.message}`);
  }
}

/**
 * Exchange Instagram code for access token
 * @param {string} code - Authorization code
 * @returns {Object} Token data
 */
async function exchangeCodeForToken(code) {
  try {
    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
        code
      })
    });

    const data = await response.json();

    if (!data.access_token) {
      throw new Error('No access token in response');
    }

    return data;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw new Error(`Failed to exchange code for token: ${error.message}`);
  }
}

module.exports = {
  getInstagramProfile,
  exchangeCodeForToken
};
