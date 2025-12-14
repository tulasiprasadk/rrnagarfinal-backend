/**
 * backend/routes/customer/auth.js
 * Customer Authentication Routes (Email OTP + Session)
 */

const express = require("express");
const router = express.Router();
const { Customer } = require("../../models");
const { sendOTP } = require("../../services/emailService");

/* =====================================================
   TEMP IN-MEMORY OTP STORE (DEV ONLY)
   ===================================================== */
const otpStore = {}; // Format: { email: { otp: "123456", expiresAt: timestamp } }

/* =====================================================
   REQUEST EMAIL OTP
   POST /api/auth/request-email-otp
   ===================================================== */
router.post("/request-email-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Check if input is email or username (phone)
    let customer;
    
    if (email.includes('@')) {
      // It's an email
      customer = await Customer.findOne({ where: { email } });
    } else {
      // It's a username (phone number)
      customer = await Customer.findOne({ where: { username: email } });
    }

    // Determine the email to send OTP to
    const targetEmail = customer ? customer.email : email;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store with 10 minute expiry (use normalized email/username as key)
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore[targetEmail] = { otp, expiresAt, inputIdentifier: email };

    // Send OTP via email
    await sendOTP(targetEmail, otp);

    console.log("📧 OTP SENT:", targetEmail, otp);

    res.json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (err) {
    console.error("OTP Send Error:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

/* =====================================================
   VERIFY EMAIL OTP
   POST /api/auth/verify-email-otp
   ===================================================== */
router.post("/verify-email-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP required" });
  }

  try {
    // Find stored OTP - check both email and username
    let stored;
    let actualEmail = email;
    
    // Check if OTP was sent to this email directly
    if (otpStore[email]) {
      stored = otpStore[email];
    } else {
      // Search for OTP by inputIdentifier
      for (const [key, value] of Object.entries(otpStore)) {
        if (value.inputIdentifier === email) {
          stored = value;
          actualEmail = key;
          break;
        }
      }
    }
    
    if (!stored || stored.otp !== otp) {
      return res.status(401).json({ error: "Invalid OTP" });
    }

    if (Date.now() > stored.expiresAt) {
      delete otpStore[actualEmail];
      return res.status(401).json({ error: "OTP expired" });
    }

    // OTP valid → delete it
    delete otpStore[actualEmail];

    // Find customer by email or username
    let customer;
    if (email.includes('@')) {
      customer = await Customer.findOne({ where: { email } });
    } else {
      customer = await Customer.findOne({ where: { username: email } });
      if (customer) {
        actualEmail = customer.email;
      }
    }

    let isNewUser = false;

    if (!customer) {
      // Create new customer (only if email was provided)
      if (email.includes('@')) {
        customer = await Customer.create({ email: actualEmail });
        isNewUser = true;
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    }

    // Save customer ID in session
    req.session.customerId = customer.id;

    res.json({
      success: true,
      message: "OTP verified, logged in",
      isNewUser,
      customerId: customer.id,
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
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
