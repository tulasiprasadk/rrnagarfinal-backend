const msg91 = require("msg91")(
  process.env.MSG91_AUTH_KEY,
  "RRNAGAR",      // your sender ID
  4               // route
);

async function sendWhatsapp(to, message) {
  try {
    await msg91.sendWhatsapp({
      flow_id: process.env.MSG91_WHATSAPP_FLOW_ID,
      recipients: [
        {
          mobiles: to,
          VAR1: message
        }
      ]
    });

    console.log("WhatsApp sent to:", to);
  } catch (err) {
    console.error("WHATSAPP ERROR:", err);
  }
}

module.exports = sendWhatsapp;
