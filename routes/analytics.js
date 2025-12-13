const express = require('express');
const router = express.Router();
const { AnalyticsVisit } = require('../models');

// CREATE visit log
router.post('/', async (req, res) => {
  try {
    const visit = await AnalyticsVisit.create(req.body);
    res.json(visit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET all visits
router.get('/', async (req, res) => {
  try {
    const visits = await AnalyticsVisit.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(visits);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
