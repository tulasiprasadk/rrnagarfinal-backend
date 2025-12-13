// backend/routes/partner.js
const express = require("express");
const router = express.Router();
const { notifyAdmin } = require("../services/adminNotify");

// POST /api/partner-inquiry
router.post("/partner-inquiry", async (req, res) => {
  try {
    const { name, phone, email, message } = req.body;

    // Validate required fields
    if (!name || !phone || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // In a production app, you'd save this to a PartnerInquiry model
    // For now, we'll just notify the admin
    const inquiry = {
      name,
      phone,
      email,
      message,
      createdAt: new Date()
    };

    // Notify admin about new partnership inquiry
    await notifyAdmin(
      "New Partnership Inquiry",
      `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nMessage: ${message}`
    );

    console.log("Partnership inquiry received:", inquiry);

    res.status(201).json({
      message: "Thank you! We'll contact you soon about partnership opportunities.",
      inquiry
    });
  } catch (error) {
    console.error("Error processing partner inquiry:", error);
    res.status(500).json({ error: "Failed to submit inquiry" });
  }
});

module.exports = router;
