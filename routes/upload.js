const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Ensure directory exists
const uploadDir = path.join(__dirname, "..", "uploads", "payment");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => 
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

/* ============================================================
   PAYMENT SCREENSHOT UPLOAD
   POST /api/upload/payment
============================================================ */
router.post("/payment", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file required" });

  res.json({
    ok: true,
    filename: req.file.filename,
    url: `/uploads/payment/${req.file.filename}`
  });
});

module.exports = router;
