/**
 * SMS Service - Supports multiple providers (Twilio, MSG91, etc.)
 * Configure via environment variables
 */

const axios = require('axios');

const SMS_PROVIDER = process.env.SMS_PROVIDER || 'console'; // 'twilio', 'msg91', 'console'
const SMS_API_KEY = process.env.SMS_API_KEY || '';
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'RRNAGR';
const SMS_TEMPLATE_ID = process.env.SMS_TEMPLATE_ID || '';

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

/**
 * Send OTP via SMS
 * @param {string} phone - Phone number with country code (e.g., +919876543210)
 * @param {string} otp - OTP code
 * @returns {Promise<boolean>} Success status
 */
async function sendOTP(phone, otp) {
  const message = `Your RR Nagar verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;

  try {
    switch (SMS_PROVIDER) {
      case 'twilio':
        return await sendViaTwilio(phone, message);
      
      case 'msg91':
        return await sendViaMSG91(phone, otp);
      
      case 'fast2sms':
        return await sendViaFast2SMS(phone, otp);
      
      case 'console':
      default:
        // Development mode - just log to console
        console.log('\n=================================');
        console.log('📱 SMS (DEV MODE)');
        console.log('To:', phone);
        console.log('OTP:', otp);
        console.log('Message:', message);
        console.log('=================================\n');
        return true;
    }
  } catch (error) {
    console.error('SMS Send Error:', error.message);
    return false;
  }
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(phone, message) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio credentials not configured');
  }

  const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  
  await twilio.messages.create({
    body: message,
    from: TWILIO_PHONE_NUMBER,
    to: phone
  });

  console.log(`SMS sent via Twilio to ${phone}`);
  return true;
}

/**
 * Send SMS via MSG91
 */
async function sendViaMSG91(phone, otp) {
  if (!SMS_API_KEY) {
    throw new Error('MSG91 API key not configured');
  }

  const url = 'https://api.msg91.com/api/v5/otp';
  
  const payload = {
    template_id: SMS_TEMPLATE_ID,
    mobile: phone.replace('+91', ''), // Remove country code for MSG91
    authkey: SMS_API_KEY,
    otp: otp,
    sender: SMS_SENDER_ID
  };

  const response = await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      'authkey': SMS_API_KEY
    }
  });

  console.log(`SMS sent via MSG91 to ${phone}`);
  return response.data.type === 'success';
}

/**
 * Send SMS via Fast2SMS
 */
async function sendViaFast2SMS(phone, otp) {
  if (!SMS_API_KEY) {
    throw new Error('Fast2SMS API key not configured');
  }

  const url = 'https://www.fast2sms.com/dev/bulkV2';
  
  const params = new URLSearchParams({
    authorization: SMS_API_KEY,
    sender_id: SMS_SENDER_ID,
    message: `Your RR Nagar OTP is ${otp}. Valid for 10 minutes.`,
    route: 'v3',
    numbers: phone.replace('+91', '')
  });

  const response = await axios.get(`${url}?${params.toString()}`);

  console.log(`SMS sent via Fast2SMS to ${phone}`);
  return response.data.return === true;
}

/**
 * Send custom SMS message
 */
async function sendSMS(phone, message) {
  try {
    switch (SMS_PROVIDER) {
      case 'twilio':
        return await sendViaTwilio(phone, message);
      
      case 'console':
      default:
        console.log('\n=================================');
        console.log('📱 SMS (DEV MODE)');
        console.log('To:', phone);
        console.log('Message:', message);
        console.log('=================================\n');
        return true;
    }
  } catch (error) {
    console.error('SMS Send Error:', error.message);
    return false;
  }
}

module.exports = {
  sendOTP,
  sendSMS
};
