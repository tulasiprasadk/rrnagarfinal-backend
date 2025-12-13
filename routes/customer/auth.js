// backend/routes/customer/auth.js
const express = require("express");
const router = express.Router();
const { Customer } = require("../../models");
const { sendOTP: sendEmailOTP } = require("../../services/emailService");

// TEMP in-memory OTP store
let otpStore = {};

// =================== REQUEST OTP ===================
router.post("/request-otp", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore[email] = { otp, expiry: otpExpiry };

  // Send OTP via email (or log in dev)
  const emailSent = await sendEmailOTP(email, otp);

  if (!emailSent) {
    console.warn('Email sending failed, but OTP stored for development');
  }

  console.log("OTP GENERATED (email):", email, otp);

  return res.json({ success: true });
});

// =================== CHECK SESSION ===================
router.get("/me", (req, res) => {
  if (!req.session || !req.session.customerId) {
    return res.json({ loggedIn: false });
  }

  const customer = req.customer || {
    id: req.session.customerId,
    name: req.session.customerName || "",
    email: req.session.customerEmail || ""
  };

  return res.json({ loggedIn: true, customer });
});

// =================== VERIFY OTP ===================
router.post("/verify-otp", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const otp = req.body.otp;

  console.log("VERIFY OTP BODY:", req.body);
  console.log("OTP STORED:", otpStore);

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const storedOtpData = otpStore[email];

  if (!storedOtpData) {
    return res.status(400).json({ error: "OTP not found. Please request new OTP." });
  }

  // Check if OTP expired
  if (Date.now() > storedOtpData.expiry) {
    delete otpStore[email];
    return res.status(400).json({ error: "OTP expired. Please request new OTP." });
  }

  if (storedOtpData.otp !== otp) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  // Find or create customer
  let customer = await Customer.findOne({ where: { email } });
  let isNewUser = false;

  if (!customer) {
    // mobile is non-null in existing DB schema; use email as fallback
    customer = await Customer.create({ email, mobile: email });
    isNewUser = true;
  }

  // Save session
  req.session.customerId = customer.id;
  req.session.customerEmail = customer.email;

  // Clear OTP after successful verification
  delete otpStore[email];

  console.log("SESSION SET:", req.session.customerId);

  // Ensure session is saved before responding
  req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);
      return res.status(500).json({ error: "Session error" });
    }
    
    return res.json({ 
      success: true, 
      customerId: customer.id,
      isNewUser: isNewUser
    });
  });
});

// =================== LOGOUT ===================
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie("rrnagar.sid"); // Match the cookie name from index.js
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    return res.json({ success: true });
  });
});

module.exports = router;
