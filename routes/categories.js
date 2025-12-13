const express = require('express');
const router = express.Router();
const { Category } = require('../models');
const { translateBatch } = require('../services/translator');

// GET all categories
router.get('/', async (req, res) => {
  try {
    const cats = await Category.findAll({ order: [['id', 'ASC']] });

    // Compute Kannada names on the fly without schema changes
    const names = cats.map(c => c.name || '');
    let knNames = [];
    try {
      knNames = await translateBatch(names, 'kn');
    } catch (e) {
      console.warn('Category translation fallback:', e.message);
      knNames = names; // fallback to original
    }

    const result = cats.map((c, idx) => ({
      ...c.toJSON(),
      nameKannada: knNames[idx] || c.name
    }));

    res.json(result);
  } catch (err) {
    console.error("Category GET error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE category
router.post('/', async (req, res) => {
  try {
    const cat = await Category.create(req.body);
    res.json(cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
