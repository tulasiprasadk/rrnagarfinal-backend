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
    const missing = [
      "Groceries",
      "Flowers",
      "Local Services",
      "Pet Services",
      "Consultancy",
      "Crackers"
    ].filter(name => !cat(name));
    if (missing.length) {
      throw new Error(`Categories not seeded or missing: ${missing.join(", ")}`);
    }

    // Create suppliers (for demonstration)
    const s1 = await Supplier.create({
      name: "FreshMart Groceries",
      phone: "9876543210",
      address: "RR Nagar, Bengaluru",
      description: "Your trusted grocery store",
    });

    // Create one approved product for each category
    const demoProducts = [
      {
        title: "Basmati Rice 1kg",
        description: "Premium long grain rice.",
        price: 120,
        unit: "kg",
        image: "https://via.placeholder.com/300x200?text=Basmati+Rice",
        CategoryId: cat("Groceries"),
        status: "approved"
      },
      {
        title: "Rose Bouquet",
        description: "Fresh red roses.",
        price: 250,
        unit: "bouquet",
        image: "https://via.placeholder.com/300x200?text=Rose+Bouquet",
        CategoryId: cat("Flowers"),
        status: "approved"
      },
      {
        title: "Plumbing Service",
        description: "Expert plumbing for your home.",
        price: 500,
        unit: "service",
        image: "https://via.placeholder.com/300x200?text=Plumbing+Service",
        CategoryId: cat("Local Services"),
        status: "approved"
      },
      {
        title: "Dog Walking",
        description: "Daily dog walking service.",
        price: 200,
        unit: "walk",
        image: "https://via.placeholder.com/300x200?text=Dog+Walking",
        CategoryId: cat("Pet Services"),
        status: "approved"
      },
      {
        title: "Tax Consultation",
        description: "Professional tax advice.",
        price: 1500,
        unit: "session",
        image: "https://via.placeholder.com/300x200?text=Tax+Consultation",
        CategoryId: cat("Consultancy"),
        status: "approved"
      },
      {
        title: "Diwali Crackers Box",
        description: "Assorted crackers for Diwali.",
        price: 800,
        unit: "box",
        image: "https://via.placeholder.com/300x200?text=Crackers+Box",
        CategoryId: cat("Crackers"),
        status: "approved"
      }
    ];
    for (const prod of demoProducts) {
      await Product.create(prod);
    }

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
