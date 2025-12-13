require('dotenv').config();   // <-- ADD THIS

const { Product, Supplier, Ad, Category, sequelize } = require('./models');

async function seed() {
  try {
    // Sync database first to create tables
    await sequelize.sync();
    
    // Clear existing data (delete in reverse dependency order)
    await sequelize.query('DELETE FROM ProductSuppliers'); // Junction table first
    await Product.destroy({ where: {} });
    await Supplier.destroy({ where: {} });
    await Ad.destroy({ where: {} });

    // Load categories (seeded separately)
    const categories = await Category.findAll();
    const cat = (name) => categories.find(c => c.name === name)?.id;
    if (!cat("Vegetables") || !cat("Groceries")) {
      throw new Error("Categories not seeded. Run seed-categories.js first.");
    }

    // Create suppliers
    const s1 = await Supplier.create({
      name: "FreshMart Groceries",
      phone: "9876543210",
      address: "RR Nagar, Bengaluru",
      description: "Your trusted grocery store",
    });

    const s2 = await Supplier.create({
      name: "RR Nagar Vegetables",
      phone: "9988776655",
      address: "Ideal Homes, RR Nagar",
      description: "Fresh vegetables & fruits",
    });

    // Create products with category assignments (use CategoryId because association adds FK)
    const p1 = await Product.create({
      title: "Organic Tomatoes",
      description: "Fresh organic tomatoes from local farms.",
      price: 30,
      unit: "kg",
      image: "https://via.placeholder.com/300x200?text=Tomatoes",
      CategoryId: cat("Vegetables")
    });

    const p2 = await Product.create({
      title: "Aashirvaad Atta 5kg",
      description: "Premium quality wheat flour.",
      price: 220,
      unit: "bag",
      image: "https://via.placeholder.com/300x200?text=Atta+5kg",
      CategoryId: cat("Groceries")
    });

    const p3 = await Product.create({
      title: "Brown Bread",
      description: "Freshly baked healthy brown bread.",
      price: 45,
      unit: "loaf",
      image: "https://via.placeholder.com/300x200?text=Brown+Bread",
      CategoryId: cat("Groceries")
    });

    // Link products to suppliers via many-to-many junction
    // Link a single product to a supplier to avoid older DB unique constraints
    await p1.addSupplier(s2);

    // Create ads with required imageUrl and position fields
    await Ad.create({
      title: "FreshMart Offer!",
      imageUrl: "https://via.placeholder.com/728x90?text=FreshMart",
      link: "https://example.com",
      position: "home_top"
    });

    await Ad.create({
      title: "Veggies Discount",
      imageUrl: "https://via.placeholder.com/728x90?text=Veggies",
      link: "https://example.com",
      position: "home_sidebar"
    });

    await Ad.create({
      title: "Local Store Promo",
      imageUrl: "https://via.placeholder.com/728x90?text=Local+Store",
      link: "https://example.com",
      position: "home_bottom"
    });

    console.log("Sample data added successfully!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
