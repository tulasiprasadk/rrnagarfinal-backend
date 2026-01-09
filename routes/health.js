const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');

router.get('/health', (req, res) => {
  res.json({ ok: true });
});

router.get('/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
});

module.exports = router;
