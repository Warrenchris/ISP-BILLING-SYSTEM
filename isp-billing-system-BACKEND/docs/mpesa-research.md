# M-Pesa Daraja API Research

## Overview
Safaricom's Daraja API provides access to M-Pesa services including:
- B2C (Business to Customer)
- C2B (Customer to Business) 
- B2B (Business to Business)
- STK Push (Lipa na M-Pesa Online)
- Transaction Status Query API
- Reversal API

## Key Requirements

### Authentication
- APIs are built on REST
- Data entities represented as HTTP resources
- HTTP verbs: GET and POST
- Request parameters and responses encoded in JSON
- HTTP status codes comply with RFC 2616

### Security Certificates
The following M-Pesa API Certificates are required for encryption of security credentials:

**Sandbox Certificate:**
- Used for testing/development
- Available for download from developer portal

**Production Certificate:**
- Used for live/production environment
- Available for download from developer portal

**Important Note:** These are NOT certificates to be installed for accessing the M-PESA Organization portal.

### Security Credentials Generation
The API requires generating security credentials for authentication.

## API Endpoints Available
- Authorization API (for access tokens)
- M-Pesa Express (STK Push)
- Transaction Status Query
- Reversal API
- B2B, B2C, C2B APIs

## Data Protection Compliance
- Data Protection Act effective November 25, 2019
- Requires minimization of customer identifiable data
- Hashing/masking techniques implemented for mobile numbers
- Limited customer names in statements and integrations

## Next Steps
1. Register for developer account
2. Create app with required APIs
3. Get consumer key and secret
4. Download certificates
5. Implement authentication flow
6. Implement STK Push functionality



## STK Push Implementation Details

### What is STK Push?
STK Push leverages the SIM Application Toolkit to send a prompt directly to a customer's phone, asking them to enter their M-Pesa PIN to complete a payment. It eliminates the need for customers to remember paybill numbers, account numbers, or transaction codes.

### Prerequisites
1. Safaricom Developer Account (register at developer.safaricom.co.ke)
2. M-Pesa API credentials (Consumer Key and Secret)
3. Node.js and npm installed
4. Basic knowledge of Express.js
5. A publicly accessible URL for callbacks (ngrok for development)

### Environment Configuration
```env
CONSUMER_KEY=your_consumer_key_here
CONSUMER_SECRET=your_consumer_secret_here
BUSINESS_SHORT_CODE=174379  # Default sandbox shortcode
PASS_KEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919  # Default sandbox passkey
CALLBACK_URL=https://your-callback-url.com/api/mpesa/callback
```

### Core Components

#### 1. Timestamp Generation
Every request requires a timestamp in format `YYYYMMDDHHmmss`:
```javascript
const getTimestamp = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};
```

#### 2. Password Generation
Base64 encoded string combining business shortcode, passkey, and timestamp:
```javascript
const getPassword = (timestamp) => {
    const shortCode = process.env.BUSINESS_SHORT_CODE;
    const passKey = process.env.PASS_KEY;
    const password = `${shortCode}${passKey}${timestamp}`;
    return Buffer.from(password).toString('base64');
};
```

#### 3. Access Token Generation
OAuth authentication with Safaricom:
```javascript
const getAccessToken = async () => {
    try {
        const url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
        const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
            }
        });
        return response.data.access_token;
    } catch(error) {
        console.error('Error getting access token:', error);
        throw error;
    }
};
```

### STK Push Request Structure
```javascript
const stkPushData = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: formattedPhone,
    PartyB: shortCode,
    PhoneNumber: formattedPhone,
    CallBackURL: process.env.CALLBACK_URL,
    AccountReference: 'Payment Reference',
    TransactionDesc: 'Payment Description'
};
```

### Phone Number Formatting
- Remove leading 0: `0712345678` → `254712345678`
- Remove +254: `+254712345678` → `254712345678`
- Keep 254 format: `254712345678` → `254712345678`

### Callback Handling
- Always respond with `{ ResultCode: 0, ResultDesc: 'Accepted' }`
- Process callback data asynchronously
- Handle both successful and failed payments
- Extract transaction details from `CallbackMetadata.Item`

### API Endpoints
- **Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest`
- **Production:** `https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest`
- **OAuth:** `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`


## Official Safaricom Node.js Library

### Installation
```bash
npm i mpesa-node
```

### Basic Usage
```javascript
const Mpesa = require('mpesa-node')
const mpesaApi = new Mpesa({ 
    consumerKey: '<your consumer key>', 
    consumerSecret: '<your consumer secret>',
    environment: 'sandbox' // or 'production'
})
```

### Available Methods
- `lipaNaMpesaOnline()` - STK Push
- `lipaNaMpesaQuery()` - Query STK Push status
- `c2bRegister()` - Register C2B URLs
- `c2bSimulate()` - Simulate C2B transaction
- `b2c()` - Business to Customer
- `b2b()` - Business to Business
- `accountBalance()` - Check account balance
- `transactionStatus()` - Check transaction status
- `reversal()` - Reverse transaction

### STK Push Example
```javascript
const testMSISDN = 254708374149
const amount = 100
const accountRef = Math.random().toString(35).substr(2, 7)
await mpesaApi.lipaNaMpesaOnline(testMSISDN, amount, URL + '/lipanampesa/success', accountRef)
```

### Configuration Options
```javascript
new Mpesa({
    consumerKey: '<your consumer key>',
    consumerSecret: '<your consumer secret>',
    environment: 'sandbox',
    shortCode: '600111',
    initiatorName: 'Test Initiator',
    lipaNaMpesaShortCode: 123456,
    lipaNaMpesaShortPass: '<some key here>',
    securityCredential: '<credential here>',
    certPath: path.resolve('keys/myKey.cert')
})
```

## Implementation Strategy
1. Create Payment model to track transactions
2. Create M-Pesa service class for API interactions
3. Implement STK Push endpoint for subscription payments
4. Handle M-Pesa callbacks for payment confirmation
5. Update subscription status based on payment results
6. Implement payment retry and failure handling

