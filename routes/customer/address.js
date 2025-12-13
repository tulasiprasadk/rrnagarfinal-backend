const express = require("express");
const router = express.Router();
const { Address } = require("../../models");

/* ======================================
   MIDDLEWARE — Require Login
====================================== */
function requireLogin(req, res, next) {
  if (!req.session.customerId) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

/* ======================================
   GET ALL ADDRESSES
====================================== */
router.get("/", requireLogin, async (req, res) => {
  console.log("📍 Fetching addresses for customer:", req.session.customerId);
  
  const addresses = await Address.findAll({
    where: { CustomerId: req.session.customerId },  // ← Capital C and D for FK
    order: [["isDefault", "DESC"]]   // Default address appears first
  });

  console.log("📍 Found", addresses.length, "addresses");
  res.json(addresses);
});

/* ======================================
   ADD NEW ADDRESS
====================================== */
router.post("/", requireLogin, async (req, res) => {
  try {
    const data = req.body;

    console.log("Creating address for customer:", req.session.customerId);
    console.log("Address data:", data);

    const address = await Address.create({
      ...data,
      CustomerId: req.session.customerId  // ← Capital C and D for Sequelize FK
    });

    res.json({ success: true, address });
  } catch (err) {
    console.error("Address creation error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================
   UPDATE ADDRESS
====================================== */
router.put("/:id", requireLogin, async (req, res) => {
  await Address.update(req.body, {
    where: { id: req.params.id, CustomerId: req.session.customerId },  // ← Capital C and D
  });

  res.json({ success: true });
});

/* ======================================
   DELETE ADDRESS
====================================== */
router.delete("/:id", requireLogin, async (req, res) => {
  await Address.destroy({
    where: { id: req.params.id, CustomerId: req.session.customerId },  // ← Capital C and D
  });

  res.json({ success: true });
});

/* ======================================
   SET DEFAULT ADDRESS
====================================== */
router.put("/:id/default", requireLogin, async (req, res) => {
  const customerId = req.session.customerId;

  // Step 1 — Unset all defaults
  await Address.update(
    { isDefault: false },
    { where: { CustomerId: customerId } }  // ← Capital C and D
  );

  // Step 2 — Set new default
  await Address.update(
    { isDefault: true },
    { where: { id: req.params.id, CustomerId: customerId } }  // ← Capital C and D
  );

  res.json({ success: true });
});

/* ======================================
   EXPORT ROUTER
====================================== */
module.exports = router;
