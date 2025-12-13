// backend/routes/customer/auth.js
const express = require("express");
const router = express.Router();
const { Customer } = require("../../models");

// TEMP in-memory OTP store
let otpStore = {};

// =================== REQUEST OTP ===================
router.post("/request-otp", async (req, res) => {
  const mobile = req.body.mobile || req.body.phone;

  if (!mobile) {
    return res.status(400).json({ error: "Mobile number missing" });
  }

  const otp = "123456"; // fixed OTP for testing

  otpStore[mobile] = otp;

  console.log("OTP GENERATED:", mobile, otp);

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
    mobile: req.session.customerMobile || ""
  };

  return res.json({ loggedIn: true, customer });
});

// =================== VERIFY OTP ===================
router.post("/verify-otp", async (req, res) => {
  const mobile = req.body.mobile || req.body.phone;
  const otp = req.body.otp;

  console.log("VERIFY OTP BODY:", req.body);
  console.log("OTP STORED:", otpStore);

  if (!mobile) {
    return res.status(400).json({ error: "Mobile number missing" });
  }

  if (otpStore[mobile] !== otp) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  // Find or create customer
  let customer = await Customer.findOne({ where: { mobile } });
  let isNewUser = false;

  if (!customer) {
    customer = await Customer.create({ mobile });
    isNewUser = true;
  }

  // Save session
  req.session.customerId = customer.id;
  req.session.customerMobile = customer.mobile;

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
