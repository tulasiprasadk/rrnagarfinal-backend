// backend/routes/varieties.js
const express = require('express');
const router = express.Router();
const { Variety, Category } = require('../models');

// Get all varieties (with optional category filter)
router.get('/', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const where = categoryId ? { categoryId } : {};
    
    const varieties = await Variety.findAll({
      where,
      include: [{ model: Category, attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });
    
    res.json(varieties);
  } catch (err) {
    console.error('Error fetching varieties:', err);
    res.status(500).json({ error: 'Failed to fetch varieties' });
  }
});

// Get varieties by category ID
router.get('/category/:categoryId', async (req, res) => {
  try {
    const varieties = await Variety.findAll({
      where: { categoryId: req.params.categoryId },
      order: [['name', 'ASC']]
    });
    
    res.json(varieties);
  } catch (err) {
    console.error('Error fetching varieties:', err);
    res.status(500).json({ error: 'Failed to fetch varieties' });
  }
});

// Get single variety
router.get('/:id', async (req, res) => {
  try {
    const variety = await Variety.findByPk(req.params.id, {
      include: [{ model: Category }]
    });
    
    if (!variety) {
      return res.status(404).json({ error: 'Variety not found' });
    }
    
    res.json(variety);
  } catch (err) {
    console.error('Error fetching variety:', err);
    res.status(500).json({ error: 'Failed to fetch variety' });
  }
});

// Create variety (Admin only)
router.post('/', async (req, res) => {
  try {
    const { categoryId, name, subVarieties, metadata } = req.body;
    
    if (!categoryId || !name) {
      return res.status(400).json({ error: 'Category ID and name are required' });
    }
    
    const variety = await Variety.create({
      categoryId,
      name,
      subVarieties: subVarieties || [],
      metadata: metadata || {}
    });
    
    res.status(201).json(variety);
  } catch (err) {
    console.error('Error creating variety:', err);
    res.status(500).json({ error: 'Failed to create variety' });
  }
});

// Update variety (Admin only)
router.put('/:id', async (req, res) => {
  try {
    const variety = await Variety.findByPk(req.params.id);
    
    if (!variety) {
      return res.status(404).json({ error: 'Variety not found' });
    }
    
    const { name, subVarieties, metadata } = req.body;
    
    await variety.update({
      name: name || variety.name,
      subVarieties: subVarieties !== undefined ? subVarieties : variety.subVarieties,
      metadata: metadata || variety.metadata
    });
    
    res.json(variety);
  } catch (err) {
    console.error('Error updating variety:', err);
    res.status(500).json({ error: 'Failed to update variety' });
  }
});

// Delete variety (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const variety = await Variety.findByPk(req.params.id);
    
    if (!variety) {
      return res.status(404).json({ error: 'Variety not found' });
    }
    
    await variety.destroy();
    res.json({ message: 'Variety deleted successfully' });
  } catch (err) {
    console.error('Error deleting variety:', err);
    res.status(500).json({ error: 'Failed to delete variety' });
  }
});

// Bulk create varieties
router.post('/bulk', async (req, res) => {
  try {
    const { varieties } = req.body;
    
    if (!Array.isArray(varieties)) {
      return res.status(400).json({ error: 'Varieties must be an array' });
    }
    
    const created = await Variety.bulkCreate(varieties);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error bulk creating varieties:', err);
    res.status(500).json({ error: 'Failed to create varieties' });
  }
});

module.exports = router;
