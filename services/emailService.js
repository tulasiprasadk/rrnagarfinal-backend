// services/emailService.js
// Lightweight email sender for OTP and notifications
// Uses SMTP if configured; falls back to console logging in development

const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // use TLS on 465
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

async function sendEmail(to, subject, text) {
  if (!to) return false;

  if (transporter) {
    await transporter.sendMail({ from: SMTP_FROM, to, subject, text });
    return true;
  }

  // Dev fallback: log instead of sending
  console.log('\n=================================');
  console.log('📧 EMAIL (DEV MODE)');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Text:', text);
  console.log('=================================\n');
  return true;
}

async function sendOTP(email, otp) {
  const subject = 'Your RR Nagar verification code';
  const message = `Your RR Nagar verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
  try {
    return await sendEmail(email, subject, message);
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
}

module.exports = { sendEmail, sendOTP };
