const express = require("express");
const router = express.Router();
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { Order } = require("../../models");

function requireLogin(req, res, next) {
  if (!req.session.customerId) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

/* ===========================================================
   MULTER STORAGE
=========================================================== */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/payments/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, "pay_" + Date.now() + ext);
  },
});

const upload = multer({ storage });

/* ===========================================================
   UPLOAD + WATERMARK PAYMENT IMAGE
=========================================================== */
router.post(
  "/upload/:orderId",
  requireLogin,
  upload.single("screenshot"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const orderId = req.params.orderId;

      const order = await Order.findOne({
        where: { id: orderId, CustomerId: req.session.customerId },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const inputPath = req.file.path;
      const outputFilename = "wm_" + req.file.filename;
      const outputPath = "uploads/payments/" + outputFilename;

      // ------------------------------
      // GENERATE TEXT WATERMARK AS PNG
      // ------------------------------
      const svgText = `
        <svg width="600" height="80">
          <style>
            .title { fill: rgba(255,255,255,0.85); font-size: 40px; font-weight: bold; text-shadow: 2px 2px 4px #000; }
          </style>
          <text x="20" y="55" class="title">RRNagar.com Payment</text>
        </svg>
      `;

      const svgBuffer = Buffer.from(svgText);

      // ------------------------------
      // APPLY WATERMARK
      // ------------------------------
      await sharp(inputPath)
        .composite([
          {
            input: svgBuffer,
            top: 20,
            left: 20,
          },
        ])
        .jpeg({ quality: 85 })
        .toFile(outputPath);

      // Save final watermarked file
      const filePath = "/uploads/payments/" + outputFilename;

      await Order.update(
        { paymentScreenshot: filePath },
        { where: { id: orderId } }
      );

      // Remove original uploaded file (optional)
      fs.unlinkSync(inputPath);

      res.json({
        success: true,
        file: filePath,
        message: "Screenshot uploaded with watermark",
      });
    } catch (err) {
      console.error("UPLOAD + WATERMARK ERROR:", err);
      res.status(500).json({ error: "Upload or watermark failed" });
    }
  }
);

module.exports = router;
