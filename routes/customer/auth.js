const express = require("express");
const router = express.Router();

// TEMP in-memory OTP store (for now)
let emailOtpStore = {};

/**
 * REQUEST EMAIL OTP
 * POST /api/customer/auth/request-email-otp
 */
router.post("/request-email-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  emailOtpStore[email] = otp;

  console.log("📧 EMAIL OTP GENERATED:", email, otp);

  // TODO: integrate email service (later)
  // sendEmail(email, otp)

  res.json({ success: true, message: "OTP sent to email" });
});

/**
 * VERIFY EMAIL OTP
 * POST /api/customer/auth/verify-email-otp
 */
router.post("/verify-email-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP required" });
  }

  const savedOtp = emailOtpStore[email];

  if (!savedOtp) {
    return res.status(400).json({ error: "OTP expired or not requested" });
  }

  if (savedOtp !== otp) {
    return res.status(401).json({ error: "Invalid OTP" });
  }

  // OTP valid — clear it
  delete emailOtpStore[email];

  res.json({
    success: true,
    message: "Email verified successfully",
  });
});

module.exports = router;
