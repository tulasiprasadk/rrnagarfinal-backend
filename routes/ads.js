import express from "express";
import { Ad } from "../models/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const ads = await Ad.findAll();
    res.json(ads);
  } catch (err) {
    console.error("Error fetching ads:", err);
    res.status(500).json({ error: "Failed to fetch ads" });
  }
});

export default router;
