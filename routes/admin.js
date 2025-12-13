const express = require('express');
const router = express.Router();
const { Category, Ad, AnalyticsVisit, Product } = require('../models');
const { translateToKannada, translateBatch } = require('../services/translator');

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Hardcoded admin credentials for now
    // TODO: Move to database with hashed passwords
    if (email === 'admin@rrnagar.com' && password === 'admin123') {
      req.session.adminId = 1;
      return res.json({ 
        success: true, 
        token: 'admin-token-' + Date.now(),
        admin: { id: 1, email: email, name: 'Admin' }
      });
    }

    res.status(401).json({ message: 'Invalid credentials' });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin logout
router.post('/logout', (req, res) => {
  req.session.adminId = null;
  res.json({ success: true });
});

// Check admin session
router.get('/me', (req, res) => {
  if (req.session.adminId) {
    return res.json({ loggedIn: true, adminId: req.session.adminId });
  }
  res.json({ loggedIn: false });
});

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const { Supplier, Product, Order, Customer } = require('../models');
    
    const totalSuppliers = await Supplier.count();
    const totalProducts = await Product.count();
    const totalOrders = await Order.count();
    const totalCustomers = await Customer.count();
    const pendingSuppliers = await Supplier.count({ where: { status: 'pending' } });
    
    const totalRevenue = await Order.sum('totalAmount') || 0;
    
    res.json({
      totalSuppliers,
      totalProducts,
      totalOrders,
      totalCustomers,
      pendingSuppliers,
      totalRevenue
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get revenue chart data
router.get('/charts/revenue', async (req, res) => {
  try {
    const { Order } = require('../models');
    const { Op } = require('sequelize');
    
    const revenue = await Order.findAll({
      attributes: [
        [Order.sequelize.fn('strftime', '%m', Order.sequelize.col('createdAt')), 'month'],
        [Order.sequelize.fn('SUM', Order.sequelize.col('totalAmount')), 'total']
      ],
      group: ['month'],
      order: [[Order.sequelize.fn('strftime', '%m', Order.sequelize.col('createdAt')), 'ASC']]
    });
    
    res.json(revenue);
  } catch (err) {
    console.error('Revenue chart error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get orders chart data
router.get('/charts/orders', async (req, res) => {
  try {
    const { Order } = require('../models');
    
    const orders = await Order.findAll({
      attributes: [
        [Order.sequelize.fn('strftime', '%m', Order.sequelize.col('createdAt')), 'month'],
        [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'count']
      ],
      group: ['month'],
      order: [[Order.sequelize.fn('strftime', '%m', Order.sequelize.col('createdAt')), 'ASC']]
    });
    
    res.json(orders);
  } catch (err) {
    console.error('Orders chart error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin root test route
router.get('/', (req, res) => {
  res.json({ message: "Admin API is running" });
});

// create category
router.post('/categories', async (req, res) => {
  const { name } = req.body;
  const cat = await Category.create({ name });
  res.json(cat);
});

// add ad
router.post('/ads', async (req, res) => {
  const ad = await Ad.create(req.body);
  res.json(ad);
});

// basic analytics endpoints (counts)
router.get('/analytics/visits', async (req, res) => {
  const count = await AnalyticsVisit.count();
  res.json({ visits: count });
});

// Admin: Create product with auto-translation
router.post('/products', async (req, res) => {
  try {
    const { title, description, price, unit, categoryId } = req.body;
    
    if (!title || !price) {
      return res.status(400).json({ error: 'Title and price are required' });
    }

    // Create product
    const product = await Product.create({
      title,
      description: description || '',
      price: parseFloat(price),
      unit: unit || 'piece',
      CategoryId: categoryId || null,
      isTemplate: true,
      supplierId: null
    });

    // Auto-translate to Kannada
    try {
      const titleKannada = await translateToKannada(product.title);
      const descriptionKannada = product.description ? await translateToKannada(product.description) : '';
      await product.update({ titleKannada, descriptionKannada });
      console.log(`Auto-translated product ${product.id}: ${product.title} -> ${titleKannada}`);
    } catch (translateErr) {
      console.error('Auto-translation failed:', translateErr);
    }

    res.status(201).json({ message: 'Product created successfully', product });
  } catch (err) {
    console.error('Product creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Translate products to Kannada
router.post('/products/translate', async (req, res) => {
  try {
    const { Product } = require('../models');
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'Please provide productIds array' });
    }

    const products = await Product.findAll({
      where: { id: productIds },
      attributes: ['id', 'title', 'description']
    });

    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found' });
    }

    // Translate titles and descriptions
    const translations = await Promise.all(
      products.map(async (product) => {
        const [titleKn, descKn] = await Promise.all([
          translateToKannada(product.title || ''),
          translateToKannada(product.description || '')
        ]);
        
        return {
          id: product.id,
          titleOriginal: product.title,
          descriptionOriginal: product.description,
          titleKannada: titleKn,
          descriptionKannada: descKn
        };
      })
    );

    res.json({ translations });
  } catch (err) {
    console.error('Translation error:', err);
    res.status(500).json({ message: 'Translation failed: ' + err.message });
  }
});

// Save translated product fields
router.put('/products/save-translation', async (req, res) => {
  try {
    const { Product } = require('../models');
    const { updates } = req.body; // Array of { id, titleKannada, descriptionKannada }

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ message: 'Please provide updates array' });
    }

    const results = await Promise.all(
      updates.map(async (update) => {
        const product = await Product.findByPk(update.id);
        if (!product) return { id: update.id, success: false, message: 'Not found' };

        await product.update({
          titleKannada: update.titleKannada ?? product.titleKannada,
          descriptionKannada: update.descriptionKannada ?? product.descriptionKannada
        });

        return { id: update.id, success: true };
      })
    );

    res.json({ results });
  } catch (err) {
    console.error('Save translation error:', err);
    res.status(500).json({ message: 'Save failed: ' + err.message });
  }
});

// Save English product fields (title, description) without affecting Kannada
router.put('/products/save-english', async (req, res) => {
  try {
    const { Product } = require('../models');
    const { updates } = req.body; // Array of { id, title, description }

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ message: 'Please provide updates array' });
    }

    const results = await Promise.all(
      updates.map(async (update) => {
        const product = await Product.findByPk(update.id);
        if (!product) return { id: update.id, success: false, message: 'Not found' };

        await product.update({
          title: update.title ?? product.title,
          description: update.description ?? product.description
        });

        return { id: update.id, success: true };
      })
    );

    res.json({ results });
  } catch (err) {
    console.error('Save English error:', err);
    res.status(500).json({ message: 'Save failed: ' + err.message });
  }
});

module.exports = router;
