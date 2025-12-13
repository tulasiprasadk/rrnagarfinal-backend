const express = require('express');
const router = express.Router();

// ⭐ Customer Routes
const customerAuth = require('./customer/auth');
const customerProfile = require('./customer/profile');
const customerAddress = require('./customer/address');

// Other route groups
const categories = require('./categories');
const products = require('./products');
const ads = require('./ads');
const suppliers = require('./suppliers');
const orders = require('./orders');
const analytics = require('./analytics');
const stock = require('./stock');
const shops = require('./shops');
const upload = require('./upload');
const adminPayments = require('./admin-payments');
const varieties = require('./varieties');
const adminProducts = require('./admin/products');

// ⭐ Mount customer routes FIRST
router.use('/auth', customerAuth);
router.use('/customer', customerProfile);
router.use('/customer/address', customerAddress);

router.use('/categories', categories);
router.use('/products', products);
router.use('/varieties', varieties);
router.use('/ads', ads);
router.use('/suppliers', suppliers);
router.use('/orders', orders);
router.use('/analytics', analytics);
router.use('/stock', stock);
router.use('/shops', shops);
router.use('/upload', upload);
router.use('/admin/payments', adminPayments);
router.use('/admin/products', adminProducts);

module.exports = router;
