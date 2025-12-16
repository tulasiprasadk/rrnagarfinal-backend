const nodemailer = require('nodemailer');
const twilio = require('twilio');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

async function sendEmail(to, subject, html) {
  if (!transporter) return;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({ from, to, subject, html });
}

async function sendSMS(to, message) {
  if (!twilioClient) return;
  await twilioClient.messages.create({ body: message, from: process.env.TWILIO_FROM_NUMBER, to });
}

async function sendWhatsApp(to, message) {
  if (!twilioClient) return;
  await twilioClient.messages.create({ body: message, from: `whatsapp:${process.env.TWILIO_FROM_NUMBER}`, to: `whatsapp:${to}` });
}

async function sendNotificationToAdmin(subject, payload) {
  try {
    await sendEmail(process.env.SMTP_USER, subject, `<pre>${JSON.stringify(payload, null, 2)}</pre>`);
  } catch (err) {
    console.error('notify admin failed', err);
  }
}

async function sendNotificationToSupplier(supplierId, subject, payload) {
  // In a real app: lookup supplier contact and send notification
  await sendNotificationToAdmin(`[supplier ${supplierId}] ${subject}`, payload);
}

async function sendNotificationToCustomer(phone, message) {
  try {
    await sendSMS(phone, message);
  } catch (err) {
    console.error('sms failed', err);
  }
}

module.exports = {
  sendEmail, sendSMS, sendWhatsApp, sendNotificationToAdmin, sendNotificationToSupplier, sendNotificationToCustomer
};