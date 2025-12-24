const express = require('express');
const { Supplier, User } = require('../../models');
const { requireAdmin } = require('../../middleware/auth');
const router = express.Router();

// GET /admin/suppliers - List suppliers (with pagination TODO)
router.get('/', requireAdmin, async (req, res) => {
  const suppliers = await Supplier.findAll({ include: [User] });
  res.json(suppliers);
});

// POST /admin/suppliers - Add supplier
router.post('/', requireAdmin, async (req, res) => {
  // TODO: Validation
  const supplier = await Supplier.create(req.body);
  res.status(201).json(supplier);
});

// PUT /admin/suppliers/:id - Edit supplier
router.put('/:id', requireAdmin, async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
  await supplier.update(req.body);
  res.json(supplier);
});

// PATCH /admin/suppliers/:id/status - Approve/block supplier
router.patch('/:id/status', requireAdmin, async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
  supplier.status = req.body.status;
  await supplier.save();
  res.json(supplier);
});

// DELETE /admin/suppliers/:id - Delete supplier
router.delete('/:id', requireAdmin, async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
  await supplier.destroy();
  res.json({ success: true });
});

module.exports = router;
