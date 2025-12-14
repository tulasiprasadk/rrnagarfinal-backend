/**
 * backend/routes/customer/auth.js
 * Customer Authentication Routes (Email OTP + Session)
 */

const express = require("express");
const router = express.Router();

/* =====================================================
   TEMP IN-MEMORY OTP STORE (DEV ONLY)
   ===================================================== */
const otpStore = {};

/* =====================================================
   REQUEST EMAIL OTP
   POST /api/auth/request-email-otp
   ===================================================== */
router.post("/request-email-otp", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Fixed OTP for development
  const otp = "123456";

  otpStore[email] = otp;

  console.log("📧 OTP GENERATED:", email, otp);

  // TODO: send real email later
  res.json({
    success: true,
    message: "OTP sent to email",
  });
});

/* =====================================================
   VERIFY EMAIL OTP
   POST /api/auth/verify-email-otp
   ===================================================== */
router.post("/verify-email-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP required" });
  }

  if (otpStore[email] !== otp) {
    return res.status(401).json({ error: "Invalid OTP" });
  }

  // OTP valid → create session
  delete otpStore[email];

  // Save customer identity in session
  req.session.customerId = email; // later replace with real customer ID

  res.json({
    success: true,
    message: "OTP verified, logged in",
  });
});

/* =====================================================
   CHECK LOGIN STATUS
   GET /api/auth/me
   ===================================================== */
router.get("/me", (req, res) => {
  if (!req.session || !req.session.customerId) {
    return res.status(401).json({
      loggedIn: false,
    });
  }

  res.json({
    loggedIn: true,
    customerId: req.session.customerId,
  });
});

/* =====================================================
   LOGOUT
   POST /api/auth/logout
   ===================================================== */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }

    res.clearCookie("rrnagar.sid");
    res.json({ success: true });
  });
});

module.exports = router;
