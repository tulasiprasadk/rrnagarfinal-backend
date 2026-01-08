const express = require('express');
const products = require('./products');
const categories = require('./categories');
const ads = require('./ads');
const admin = require('./admin');

const router = express.Router();

router.use('/products', products);
router.use('/categories', categories);
router.use('/ads', ads);
router.use('/admin', admin);
const uploads = require('./uploads');
router.use('/uploads', uploads);
// Simple health/db endpoints from `api/`
try {
	const dbTest = require('../api/db-test');
	router.get('/db-test', dbTest);
} catch (e) {
	console.warn('db-test not available:', e && e.message ? e.message : e);
}
const health = require('./health');
router.use('/', health);

module.exports = router;
