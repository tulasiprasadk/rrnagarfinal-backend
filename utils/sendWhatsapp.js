const axios = require('axios');

async function sendWhatsapp(to, message) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const flowId = process.env.MSG91_WHATSAPP_FLOW_ID;

  if (!authKey || !flowId) {
    console.warn('MSG91 WhatsApp not configured (missing MSG91_AUTH_KEY or MSG91_WHATSAPP_FLOW_ID)');
    return false;
  }

  const url = 'https://api.msg91.com/api/v5/flow/';
  const payload = {
    flow_id: flowId,
    recipients: [
      {
        mobiles: to,
        VAR1: message
      }
    ]
  };

  try {
    const res = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'authkey': authKey
      }
    });

    console.log('WhatsApp sent to:', to);
    return res && res.data ? res.data : true;
  } catch (err) {
    console.error('WHATSAPP ERROR:', err && err.message ? err.message : err);
    return false;
  }
}

module.exports = sendWhatsapp;
