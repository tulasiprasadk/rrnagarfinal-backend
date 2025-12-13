const express = require("express");
const router = express.Router();
const { Ad } = require("../models");

/* ============================================================
   GET ALL ADS
   GET /api/ads
============================================================ */
router.get("/", async (req, res) => {
  try {
    const ads = await Ad.findAll({
      order: [["id", "DESC"]],
    });
    res.json(ads);
  } catch (err) {
    console.error("Ads fetch error:", err);
    res.status(500).json({ error: "Server error fetching ads" });
  }
});

/* ============================================================
   GET ACTIVE ADS
   GET /api/ads/all
============================================================ */
router.get("/all", async (req, res) => {
  try {
    const ads = await Ad.findAll({
      where: { active: true },
      order: [["order", "ASC"]],
    });
    res.json(ads);
  } catch (err) {
    console.error("Ads fetch error:", err);
    res.status(500).json({ error: "Server error fetching ads" });
  }
});

/* ============================================================
   CREATE AD
   POST /api/ads
============================================================ */
router.post("/", async (req, res) => {
  try {
    const ad = await Ad.create(req.body);
    res.json(ad);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
