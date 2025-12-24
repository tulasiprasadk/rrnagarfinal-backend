import express from 'express';
import bcrypt from 'bcrypt';
import { Category, Ad, AnalyticsVisit, Product, Admin } from '../models/index.js';
import { translateToKannada } from '../services/translator.js';
const router = express.Router();

/* ======================================================
   MIDDLEWARE
====================================================== */

// Middleware to check if current admin is super admin
async function requireSuperAdmin(req, res, next) {
  try {
    if (!req.session || !req.session.adminId) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const admin = await Admin.findByPk(req.session.adminId);
    if (!admin || admin.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    req.currentAdmin = admin;
    next();
  } catch (err) {
    console.error('Super admin check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/* ======================================================
   AUTH
====================================================== */

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await admin.update({ lastLogin: new Date() });
    req.session.adminId = admin.id;

    res.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.adminId = null;
  res.json({ success: true });
});

// Session check
router.get('/me', (req, res) => {
  res.json({
    loggedIn: !!req.session.adminId,
    adminId: req.session.adminId || null
  });
});

/* ======================================================
   SUPER ADMIN
====================================================== */

router.post('/admins/:id/approve', requireSuperAdmin, async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    if (admin.isActive) {
      return res.json({ success: true, message: 'Admin already active' });
    }

    await admin.update({ isActive: true });
    res.json({ success: true, message: 'Admin approved' });
  } catch (err) {
    console.error('Approve admin error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admins/pending', requireSuperAdmin, async (req, res) => {
  try {
    const pendingAdmins = await Admin.findAll({ where: { isActive: false } });
    res.json(pendingAdmins);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ======================================================
   DASHBOARD
====================================================== */

router.get('/stats', async (req, res) => {
  try {
    const { Supplier, Order, Customer } = require('../models');

    res.json({
      totalSuppliers: await Supplier.count(),
      totalProducts: await Product.count(),
      totalOrders: await Order.count(),
      totalCustomers: await Customer.count(),
      pendingSuppliers: await Supplier.count({ where: { status: 'pending' } }),
      totalRevenue: (await Order.sum('totalAmount')) || 0
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({});
  }
});

// Revenue chart (SAFE ARRAY)
router.get('/charts/revenue', (req, res) => {
  res.json([]);
});

// Orders chart (SAFE ARRAY)
router.get('/charts/orders', (req, res) => {
  res.json([]);
});

/* ======================================================
   NOTIFICATIONS (STUB)
====================================================== */

router.get('/notifications', (req, res) => {
  res.json([]);
});

/* ======================================================
   CATEGORIES & ADS
====================================================== */

router.post('/categories', async (req, res) => {
  const cat = await Category.create({ name: req.body.name });
  res.json(cat);
});

router.post('/ads', async (req, res) => {
  const ad = await Ad.create(req.body);
  res.json(ad);
});

/* ======================================================
   ANALYTICS
====================================================== */

router.get('/analytics/visits', async (req, res) => {
  const visits = await AnalyticsVisit.count();
  res.json({ visits });
});

/* ======================================================
   PRODUCTS
====================================================== */

router.post('/products', async (req, res) => {
  try {
    const { title, description, price, unit, categoryId } = req.body;
    if (!title || !price) {
      return res.status(400).json({ error: 'Title and price required' });
    }

    const product = await Product.create({
      title,
      description: description || '',
      price: Number(price),
      unit: unit || 'piece',
      CategoryId: categoryId || null,
      isTemplate: true,
      supplierId: null
    });

    try {
      await product.update({
        titleKannada: await translateToKannada(product.title),
        descriptionKannada: product.description
          ? await translateToKannada(product.description)
          : ''
      });
    } catch (e) {
      console.warn('Translation skipped');
    }

    res.status(201).json(product);
  } catch (err) {
    console.error('Product create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ======================================================
   ROOT
====================================================== */

router.get('/', (req, res) => {
  res.json({ message: 'Admin API running' });
});

export default router;
