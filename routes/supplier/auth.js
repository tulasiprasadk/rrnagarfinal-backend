/**
 * backend/routes/supplier/auth.js
 * Supplier Authentication (Email OTP)
 */

const express = require("express");
const router = express.Router();
const { Supplier } = require("../../models");
const { sendOTP } = require("../../services/emailService");

const otpStore = {}; // Format: { email: { otp: "123456", expiresAt: timestamp } }

/* =====================================================
   REQUEST EMAIL OTP (Supplier Login)
   POST /api/supplier/auth/request-email-otp
   ===================================================== */
router.post("/request-email-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Check if supplier exists
    const supplier = await Supplier.findOne({ where: { email } });

    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found with this email" });
    }

    // Check approval status
    if (supplier.status === 'pending') {
      return res.status(403).json({ 
        error: "Your account is pending admin approval",
        status: 'pending'
      });
    }

    if (supplier.status === 'rejected') {
      return res.status(403).json({ 
        error: "Your account has been rejected",
        status: 'rejected',
        reason: supplier.rejectionReason
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store with 10 minute expiry
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore[email] = { otp, expiresAt };

    // Send OTP via email
    await sendOTP(email, otp);

    console.log("📧 SUPPLIER OTP SENT:", email, otp);

    res.json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (err) {
    console.error("Supplier OTP Send Error:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

/* =====================================================
   VERIFY EMAIL OTP (Supplier Login)
   POST /api/supplier/auth/verify-email-otp
   ===================================================== */
router.post("/verify-email-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP required" });
  }

  // Check if OTP exists and is valid
  const stored = otpStore[email];
  
  if (!stored || stored.otp !== otp) {
    return res.status(401).json({ error: "Invalid OTP" });
  }

  if (Date.now() > stored.expiresAt) {
    delete otpStore[email];
    return res.status(401).json({ error: "OTP expired" });
  }

  try {
    // OTP valid → delete it
    delete otpStore[email];

    // Find supplier
    const supplier = await Supplier.findOne({ where: { email } });

    if (!supplier || supplier.status !== 'approved') {
      return res.status(403).json({ error: "Access denied" });
    }

    // Save supplier ID in session
    req.session.supplierId = supplier.id;

    res.json({
      success: true,
      message: "OTP verified, logged in",
      supplier: {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        businessName: supplier.businessName
      }
    });
  } catch (err) {
    console.error("Supplier Verify OTP Error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

/* =====================================================
   CHECK LOGIN STATUS
   GET /api/supplier/auth/me
   ===================================================== */
router.get("/me", async (req, res) => {
  if (!req.session || !req.session.supplierId) {
    return res.status(401).json({ loggedIn: false });
  }

  try {
    const supplier = await Supplier.findByPk(req.session.supplierId);
    
    if (!supplier) {
      return res.status(401).json({ loggedIn: false });
    }

    res.json({
      loggedIn: true,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        businessName: supplier.businessName,
        status: supplier.status
      }
    });
  } catch (err) {
    console.error("Supplier Auth Check Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =====================================================
   LOGOUT
   POST /api/supplier/auth/logout
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
