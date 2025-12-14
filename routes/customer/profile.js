const express = require("express");
const router = express.Router();
const { Customer } = require("../../models");

// GET PROFILE
router.get("/", async (req, res) => {
  try {
    if (!req.session.customerId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const customer = await Customer.findByPk(req.session.customerId);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json(customer);
  } catch (err) {
    console.error("PROFILE GET ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// UPDATE PROFILE
router.put("/", async (req, res) => {
  try {
    if (!req.session.customerId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const customer = await Customer.findByPk(req.session.customerId);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // If updating username, check if it's unique
    if (req.body.username && req.body.username !== customer.username) {
      const existingUser = await Customer.findOne({ 
        where: { username: req.body.username } 
      });
      
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    await customer.update(req.body);

    res.json({ success: true, customer });
  } catch (err) {
    console.error("PROFILE UPDATE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
