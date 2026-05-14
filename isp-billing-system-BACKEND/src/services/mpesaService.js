const axios = require('axios');
const moment = require('moment');
const crypto = require('crypto');
require('dotenv').config();

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE || process.env.MPESA_SHORTCODE;
    this.passKey = process.env.MPESA_PASS_KEY || process.env.MPESA_PASSKEY;
    this.callbackUrl = process.env.MPESA_CALLBACK_URL;
    this.environment = process.env.MPESA_ENV || 'sandbox';
    
    // Set base URLs based on environment
    this.baseUrl = this.environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';
    
    this.accessToken = null;
    this.tokenExpiry = null;
    this._tokenPromise = null;
  }

  /**
   * Generate timestamp in the format required by M-Pesa
   * @returns {string} Timestamp in YYYYMMDDHHmmss format
   */
  generateTimestamp() {
    return moment().format('YYYYMMDDHHmmss');
  }

  /**
   * Generate password for STK Push
   * @param {string} timestamp - Timestamp in YYYYMMDDHHmmss format
   * @returns {string} Base64 encoded password
   */
  generatePassword(timestamp) {
    const password = `${this.businessShortCode}${this.passKey}${timestamp}`;
    return Buffer.from(password).toString('base64');
  }

  /**
   * Format phone number to M-Pesa format (254XXXXXXXXX)
   * @param {string} phoneNumber - Phone number in various formats
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove any spaces, dashes, or plus signs
    let formatted = phoneNumber.replace(/[\s\-\+]/g, '');
    
    // Handle different formats
    if (formatted.startsWith('0')) {
      // Convert 0712345678 to 254712345678
      formatted = `254${formatted.slice(1)}`;
    } else if (formatted.startsWith('254')) {
      // Already in correct format
      formatted = formatted;
    } else if (formatted.startsWith('7') || formatted.startsWith('1')) {
      // Handle 712345678 or 112345678
      formatted = `254${formatted}`;
    } else {
      throw new Error('Invalid phone number format');
    }
    
    // Validate final format
    if (!/^254[0-9]{9}$/.test(formatted)) {
      throw new Error('Phone number must be a valid Kenyan number');
    }
    
    return formatted;
  }

  /**
   * Get access token from M-Pesa API
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    // Reuse in-flight request if one is already running
    if (this._tokenPromise) return this._tokenPromise;

    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    this._tokenPromise = this._fetchNewToken()
      .then(token => { this._tokenPromise = null; return token; })
      .catch(err  => { this._tokenPromise = null; throw err; });

    return this._tokenPromise;
  }

  async _fetchNewToken() {
    if (!this.consumerKey || !this.consumerSecret) {
      const configError = new Error('Mpesa integration not configured. Please contact admin.');
      configError.code = 'MPESA_NOT_CONFIGURED';
      throw configError;
    }

    const url = `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      this.accessToken = response.data.access_token;
      // Token expires in 1 hour, we'll refresh 5 minutes early
      this.tokenExpiry = new Date(Date.now() + (55 * 60 * 1000));

      console.log('✅ M-Pesa access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Error getting M-Pesa access token:', error.response?.data || error.message);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  /**
   * Initiate STK Push payment
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} STK Push response
   */
  async initiateSTKPush(paymentData) {
    try {
      const { phoneNumber, amount, accountReference, transactionDesc } = paymentData;
      
      // Validate inputs
      if (!phoneNumber || !amount || !accountReference) {
        throw new Error('Phone number, amount, and account reference are required');
      }

      if (amount < 1) {
        throw new Error('Amount must be at least KES 1');
      }

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Get access token
      const accessToken = await this.getAccessToken();
      
      // Generate timestamp and password
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);
      
      // Prepare STK Push request
      const url = `${this.baseUrl}/mpesa/stkpush/v1/processrequest`;
      const requestData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount), // Ensure amount is integer
        PartyA: formattedPhone,
        PartyB: this.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc || 'ISP Service Payment'
      };

      console.log('🚀 Initiating STK Push:', {
        phone: formattedPhone,
        amount: requestData.Amount,
        reference: accountReference
      });

      const response = await axios.post(url, requestData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log('✅ STK Push initiated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error initiating STK Push:', error.response?.data || error.message);
      
      if (error.response?.data) {
        throw new Error(error.response.data.errorMessage || 'STK Push failed');
      }
      throw error;
    }
  }

  /**
   * Query STK Push transaction status
   * @param {string} checkoutRequestId - Checkout request ID from STK Push
   * @returns {Promise<Object>} Transaction status
   */
  async querySTKPushStatus(checkoutRequestId) {
    try {
      if (!checkoutRequestId) {
        throw new Error('Checkout request ID is required');
      }

      // Get access token
      const accessToken = await this.getAccessToken();
      
      // Generate timestamp and password
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);
      
      const url = `${this.baseUrl}/mpesa/stkpushquery/v1/query`;
      const requestData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await axios.post(url, requestData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error querying STK Push status:', error.response?.data || error.message);
      
      if (error.response?.data) {
        throw new Error(error.response.data.errorMessage || 'Status query failed');
      }
      throw error;
    }
  }

  /**
   * Process M-Pesa callback data
   * @param {Object} callbackData - Callback data from M-Pesa
   * @returns {Object} Processed callback information
   */
  processCallback(callbackData) {
    try {
      const stkCallback = callbackData.Body?.stkCallback;
      
      if (!stkCallback) {
        throw new Error('Invalid callback data structure');
      }

      const result = {
        merchantRequestId: stkCallback.MerchantRequestID,
        checkoutRequestId: stkCallback.CheckoutRequestID,
        resultCode: stkCallback.ResultCode,
        resultDesc: stkCallback.ResultDesc,
        success: stkCallback.ResultCode === 0
      };

      // If payment was successful, extract transaction details
      if (result.success && stkCallback.CallbackMetadata?.Item) {
        const metadata = {};
        stkCallback.CallbackMetadata.Item.forEach(item => {
          metadata[item.Name] = item.Value;
        });

        result.transactionDetails = {
          amount: metadata.Amount,
          mpesaReceiptNumber: metadata.MpesaReceiptNumber,
          transactionDate: new Date(metadata.TransactionDate),
          phoneNumber: metadata.PhoneNumber
        };
      }

      return result;
    } catch (error) {
      console.error('❌ Error processing M-Pesa callback:', error.message);
      throw error;
    }
  }

  /**
   * Validate M-Pesa environment configuration
   * @returns {Object} Validation result
   */
  validateConfiguration() {
    const required = [
      'MPESA_CONSUMER_KEY',
      'MPESA_CONSUMER_SECRET', 
      'MPESA_BUSINESS_SHORT_CODE',
      'MPESA_PASS_KEY',
      'MPESA_CALLBACK_URL'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.error('❌ Missing M-Pesa configuration:',missing);
      throw new Error(`Missing M-Pesa configuration: ${missing.join(', ')}`);
    }  
    
    return true;
  }

  /**
   * Get transaction status description
   * @param {number} resultCode - M-Pesa result code
   * @returns {string} Human readable status
   */
  getStatusDescription(resultCode) {
    const statusCodes = {
      0: 'Success',
      1: 'Insufficient Funds',
      2: 'Less Than Minimum Transaction Value',
      3: 'More Than Maximum Transaction Value',
      4: 'Would Exceed Daily Transfer Limit',
      5: 'Would Exceed Minimum Balance',
      6: 'Unresolved Primary Party',
      7: 'Unresolved Receiver Party',
      8: 'Would Exceed Maximum Balance',
      11: 'Debit Account Invalid',
      12: 'Credit Account Invalid',
      13: 'Unresolved Debit Account',
      14: 'Unresolved Credit Account',
      15: 'Duplicate Detected',
      17: 'Internal Failure',
      20: 'Unresolved Initiator',
      26: 'Traffic Blocking Condition In Place',
      1001: 'Unable to lock subscriber, a transaction is already in process for the current subscriber',
      1019: 'Transaction expired',
      1032: 'Request cancelled by user',
      1037: 'DS timeout user cannot be reached',
      2001: 'Invalid PIN',
      4001: 'Transaction failed'
    };

    return statusCodes[resultCode] || `Unknown status code: ${resultCode}`;
  }
}

module.exports = MpesaService;

