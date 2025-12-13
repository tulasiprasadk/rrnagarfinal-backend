const express = require('express');
const router = express.Router();
const { Product, Supplier, Category, Ad, AnalyticsVisit, ProductSupplier } = require('../models');
const multer = require('multer');
const path = require('path');
const { translateToKannada } = require('../services/translator');

// Configure multer for product images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/products/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// GET /api/products?query=...
router.get('/', async (req, res) => {
  try {
    const { q, search, categoryId, variety, supplier } = req.query;
    const supplierFilter = supplier === 'true';
    const Op = require('sequelize').Op;
    
    let where = {};
    
    // Search query - checks title, variety, subVariety, description
    const searchTerm = search || q;
    if (searchTerm) {
      where[Op.or] = [
        { title: { [Op.like]: `%${searchTerm}%` } },
        { variety: { [Op.like]: `%${searchTerm}%` } },
        { subVariety: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } }
      ];
    }
    
    // Filter by category
    if (categoryId) {
      where.CategoryId = parseInt(categoryId);
    }
    
    // Filter by variety
    if (variety) {
      where.variety = variety;
    }
    
    // If supplier filter is requested, add supplierId from session
    if (supplierFilter && req.session.supplierId) {
      where.supplierId = req.session.supplierId;
    }
    
    const products = await Product.findAll({ 
      where, 
      include: [
        { model: Supplier, as: 'suppliers', attributes: ['id', 'name', 'phone'], through: { attributes: [] } },
        { model: Category, attributes: ['id', 'name', 'icon'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET product by id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, { 
      include: [
        { model: Supplier, as: 'suppliers', attributes: ['id', 'name', 'phone'], through: { attributes: [] } },
        { model: Category, attributes: ['id', 'name', 'icon'] }
      ]
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ads
router.get('/ads/all', async (req, res) => {
  const ads = await Ad.findAll({ where: { active: true }, order: [['order', 'ASC']] });
  res.json(ads);
});

// analytics: record visit
router.post('/visit', async (req, res) => {
  try {
    await AnalyticsVisit.create({
      path: req.body.path,
      referrer: req.body.referrer || '',
      ip: req.ip,
      userAgent: req.get('User-Agent') || ''
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

// POST /api/products - Add new product (for suppliers)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, title, price, description, image_url, categoryId, variety, subVariety, unit, templateId } = req.body;
    const supplierId = req.session.supplierId;
    const adminId = req.session.adminId;

    // Either supplier or admin must be authenticated
    if (!supplierId && !adminId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const productData = {
      title: title || name,
      price: parseFloat(price),
      description: description || '',
      image: req.file ? req.file.path : (image_url || ''),
      variety: variety || null,
      subVariety: subVariety || null,
      unit: unit || 'piece',
      supplierId: supplierId || null,
      CategoryId: categoryId || null,
      isTemplate: adminId && !supplierId ? true : false // Admin creates templates
    };

    // If supplier is using a template, copy template details
    if (templateId && supplierId) {
      const template = await Product.findByPk(templateId);
      if (template && template.isTemplate) {
        productData.title = template.title;
        productData.description = template.description;
        productData.variety = variety || template.variety;
        productData.subVariety = subVariety || template.subVariety;
        productData.unit = template.unit;
        productData.CategoryId = template.CategoryId || template.categoryId;
        productData.image = req.file ? req.file.path : (template.image || '');
        productData.isTemplate = false;
      }
    }

    const product = await Product.create(productData);
    
    // Automatically translate to Kannada
    try {
      const titleKannada = await translateToKannada(product.title);
      const descriptionKannada = product.description ? await translateToKannada(product.description) : '';
      await product.update({ 
        titleKannada, 
        descriptionKannada 
      });
      console.log(`Auto-translated product ${product.id}: ${product.title} -> ${titleKannada}`);
    } catch (translateErr) {
      console.error('Auto-translation failed:', translateErr);
      // Continue without translation - don't fail the product creation
    }
    
    res.status(201).json({ message: 'Product added successfully', product });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/bulk - Bulk upload products (admin only)
router.post('/bulk', async (req, res) => {
  try {
    const adminId = req.session.adminId;
    if (!adminId && !allowWithoutSession) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    const { products } = req.body; // Array of product objects
    
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    const createdProducts = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      try {
        const p = products[i];
        const product = await Product.create({
          title: p.title || p.name,
          description: p.description || '',
          price: parseFloat(p.price || 0),
          variety: p.variety || null,
          subVariety: p.subVariety || null,
          unit: p.unit || 'piece',
          CategoryId: p.categoryId || null,
          isTemplate: true,
          supplierId: null
        });
        
        // Auto-translate to Kannada
        try {
          const titleKannada = await translateToKannada(product.title);
          const descriptionKannada = product.description ? await translateToKannada(product.description) : '';
          await product.update({ titleKannada, descriptionKannada });
        } catch (translateErr) {
          console.error(`Translation failed for product ${i}:`, translateErr);
        }
        
        createdProducts.push(product);
      } catch (err) {
        errors.push({ index: i, error: err.message, product: products[i] });
      }
    }

    res.json({
      message: `Bulk upload completed. ${createdProducts.length} products created.`,
      created: createdProducts.length,
      errors: errors.length,
      errorDetails: errors
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/templates - Get all product templates (for suppliers to choose from)
router.get('/templates/all', async (req, res) => {
  try {
    const templates = await Product.findAll({
      where: { isTemplate: true },
      include: [Category],
      order: [['title', 'ASC']]
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, title, price, description, image_url, categoryId } = req.body;
    const supplierId = req.session.supplierId;

    if (!supplierId) {
      return res.status(401).json({ error: 'Not authenticated as supplier' });
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.supplierId !== supplierId) {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }

    const updateData = {
      title: title || name || product.title,
      price: price ? parseFloat(price) : product.price,
      description: description !== undefined ? description : product.description,
      CategoryId: categoryId !== undefined ? categoryId : product.CategoryId
    };

    if (req.file) {
      updateData.image = req.file.path;
    } else if (image_url) {
      updateData.image = image_url;
    }

    await product.update(updateData);
    res.json({ message: 'Product updated successfully', product });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    const supplierId = req.session.supplierId;
    const adminId = req.session.adminId || (req.headers['x-admin-token'] ? 1 : null);

    // Admin UI currently works without explicit login token; allow delete if no session
    const allowWithoutSession = !supplierId && !adminId;

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!adminId) {
      const legacyMatch = product.supplierId === supplierId;
      const junctionMatch = await ProductSupplier.findOne({
        where: { productId: product.id, supplierId }
      });

      if (!legacyMatch && !junctionMatch) {
        return res.status(403).json({ error: 'Not authorized to delete this product' });
      }
    }

    await ProductSupplier.destroy({ where: { productId: product.id } });
    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;