const express = require("express");
const router = express.Router();
const { Product, Category } = require("../models");
const { Op } = require("sequelize");

/* =====================================================
   GET /api/products
   - Public: approved products only
   - Supports categoryId + global search (q)
===================================================== */
router.get("/", async (req, res) => {
  try {
    const { categoryId, q } = req.query;

    const where = {
      status: "approved",
    };

    if (categoryId) {
      where.CategoryId = Number(categoryId);
    }

    if (q) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${q}%` } },
        { variety: { [Op.iLike]: `%${q}%` } },
        { subVariety: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const products = await Product.findAll({
      where,
      include: [
        {
          model: Category,
          attributes: ["id", "name"],
        },
      ],
      order: [["id", "DESC"]],
    });

    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/* =====================================================
   GET /api/products/health
===================================================== */
router.get("/health", (req, res) => {
  res.json({ ok: true });
});

/* =====================================================
   POST /api/products/bulk
   - Strict CategoryId enforcement
   - Optional categoryName → categoryId mapping
   - Rejects bad rows, inserts valid ones
===================================================== */
router.post("/bulk", async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "products array required" });
    }

    // Load categories once (for name → id mapping)
    const categories = await Category.findAll({
      attributes: ["id", "name"],
    });

    const categoryMap = {};
    categories.forEach((c) => {
      categoryMap[c.name.toLowerCase()] = c.id;
    });

    const validProducts = [];
    const errorDetails = [];

    products.forEach((p, index) => {
      const row = index + 1;

      try {
        if (!p.title) {
          throw new Error("Missing title");
        }

        let categoryId = p.CategoryId;

        // Fallback: resolve from categoryName if provided
        if (!categoryId && p.categoryName) {
          categoryId = categoryMap[p.categoryName.toLowerCase()];
        }

        if (!categoryId) {
          throw new Error("Missing or invalid CategoryId");
        }

        validProducts.push({
          title: p.title,
          variety: p.variety || null,
          subVariety: p.subVariety || null,
          price: Number(p.price) || 0,
          unit: p.unit || null,
          description: p.description || null,
          CategoryId: categoryId,
          status: "approved", // auto-approve
        });
      } catch (e) {
        errorDetails.push(`Row ${row}: ${e.message}`);
      }
    });

    // Final safety check
    if (validProducts.some((p) => !p.CategoryId)) {
      return res.status(400).json({
        error: "Validation failed: CategoryId cannot be null",
      });
    }

    // Bulk insert (fast + atomic)
    await Product.bulkCreate(validProducts);

    res.json({
      success: true,
      created: validProducts.length,
      errors: errorDetails.length,
      errorDetails,
    });
  } catch (err) {
    console.error("Bulk upload error:", err);
    res.status(500).json({ error: "Bulk upload failed" });
  }
});

module.exports = router;
