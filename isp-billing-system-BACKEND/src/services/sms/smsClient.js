/**
 * SMS Client Gateway Adapter
 *
 * Integrates directly with outbound SMS gateways using Axios:
 *   - Africa's Talking (REST HTTP API using x-www-form-urlencoded)
 *   - Advanta Africa (Stub for future activation)
 *   - Mock adapter (Consoles payload and returns zero-cost dummy values)
 */

const axios = require('axios');
const logger = require('../../config/logger');

/**
 * Send SMS message via the configured provider gateway.
 *
 * @param {string} phone - normalized recipient phone number (E.164)
 * @param {string} message - interpolated text message body
 * @returns {Promise<object>} Parsed result: { success, provider, providerResponse, cost, errorMessage }
 */
async function sendSms(phone, message) {
  const provider = process.env.SMS_PROVIDER || 'mock';

  // Override to mock in CI/testing environments
  if (process.env.MOCK_MIKROTIK === 'true' || provider === 'mock') {
    return sendMockSms(phone, message);
  }

  switch (provider) {
    case 'africastalking':
      return sendAfricasTalkingSms(phone, message);
    case 'advanta':
      return sendAdvantaSms(phone, message);
    default:
      logger.warn(`Unknown SMS_PROVIDER "${provider}". Falling back to mock SMS send.`);
      return sendMockSms(phone, message);
  }
}

/**
 * Send SMS via Africa's Talking API.
 */
async function sendAfricasTalkingSms(phone, message) {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  const senderId = process.env.AT_SENDER_ID;

  if (!username || !apiKey) {
    return {
      success: false,
      provider: 'africastalking',
      cost: 0.00,
      errorMessage: 'Missing AT_USERNAME or AT_API_KEY environment variables',
      providerResponse: null,
    };
  }

  // Choose sandbox vs production endpoints
  const domain = username.toLowerCase() === 'sandbox' ? 'sandbox.africastalking.com' : 'api.africastalking.com';
  const url = `https://api.${domain}/version1/messaging`;

  // Build form-urlencoded request body parameters
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('to', phone);
  params.append('message', message);
  if (senderId) {
    params.append('from', senderId);
  }

  try {
    logger.debug(`Sending AT SMS to "${phone}"`, { url, senderId });

    const response = await axios.post(url, params.toString(), {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey: apiKey,
      },
      timeout: 10000, // 10 seconds timeout
    });

    const data = response.data;
    const recipients = data?.SMSMessageData?.Recipients || [];

    if (recipients.length === 0) {
      throw new Error('AT API returned an empty recipients list');
    }

    const recipientResult = recipients[0];
    const status = recipientResult.status; // e.g. "Success" or "Failed"
    const isSuccess = status.toLowerCase() === 'success';

    // Parse cost string (e.g. "KES 0.8000" or "UGX 22.0000") to numeric decimal
    let cost = 0.00;
    if (recipientResult.cost) {
      const parsedCost = parseFloat(recipientResult.cost.replace(/[^\d.]/g, ''));
      if (!isNaN(parsedCost)) {
        cost = parsedCost;
      }
    }

    return {
      success: isSuccess,
      provider: 'africastalking',
      cost,
      errorMessage: isSuccess ? null : recipientResult.failureReason || `Gateway status: ${status}`,
      providerResponse: data,
    };

  } catch (err) {
    logger.error('Africa\'s Talking API error', { error: err.message, phone });
    return {
      success: false,
      provider: 'africastalking',
      cost: 0.00,
      errorMessage: err.response?.data?.errorMessage || err.message,
      providerResponse: err.response?.data || null,
    };
  }
}

/**
 * Send SMS via Advanta Africa (Stub).
 */
async function sendAdvantaSms(phone, message) {
  // Not implemented, returns failure log stub
  logger.warn('Advanta Africa SMS gateway is not yet implemented');
  return {
    success: false,
    provider: 'advanta',
    cost: 0.00,
    errorMessage: 'Advanta Africa gateway is not configured / implemented',
    providerResponse: null,
  };
}

/**
 * Mock SMS Client for testing/CI.
 */
async function sendMockSms(phone, message) {
  logger.info(`[MOCK SMS SEND] To: ${phone} | Msg: "${message}"`);
  return {
    success: true,
    provider: 'mock',
    cost: 0.00,
    errorMessage: null,
    providerResponse: { mock: true, sentAt: new Date().toISOString() },
  };
}

module.exports = {
  sendSms,
};
