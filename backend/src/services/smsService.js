/**
 * SMS Service - Twilio Integration
 * Handles sending verification codes via SMS
 */

const twilio = require('twilio');

let twilioClient = null;

// Initialize Twilio client if credentials are provided
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log('✅ Twilio SMS service initialized');
} else {
  console.warn('⚠️  Twilio credentials not configured - SMS will be mocked');
}

/**
 * Send SMS message
 * @param {string} to - Phone number to send to (E.164 format)
 * @param {string} message - Message content
 */
async function sendSMS(to, message) {
  try {
    if (!twilioClient) {
      // Mock mode for development
      console.log(`📱 [MOCK SMS] To: ${to}, Message: ${message}`);
      return {
        success: true,
        sid: 'mock_' + Date.now(),
        mock: true
      };
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log(`✅ SMS sent: ${result.sid}`);

    return {
      success: true,
      sid: result.sid
    };
  } catch (error) {
    console.error('SMS send error:', error);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
}

/**
 * Send verification code
 * @param {string} phoneNumber - Phone number
 * @param {string} code - 6-digit verification code
 */
async function sendVerificationCode(phoneNumber, code) {
  const message = `Your Gatsby verification code is: ${code}\n\nDon't share this code with anyone.`;
  return sendSMS(phoneNumber, message);
}

module.exports = {
  sendSMS,
  sendVerificationCode
};
