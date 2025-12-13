// scripts/seedCategories.js
const { Category, sequelize } = require("../models");

async function seedCategories() {
  const categories = [
    { name: "Flowers", icon: "🌸" },
    { name: "Crackers", icon: "🎆" },
    { name: "Vegetables", icon: "🥬" },
    { name: "Fruits", icon: "🍎" },
    { name: "Milk Products", icon: "🥛" },
    { name: "Groceries", icon: "🛒" }
  ];

  await sequelize.sync({ force: false });

  console.log("Clearing old categories...");
  await Category.destroy({ where: {} });

  console.log("Adding new categories...");
  for (const cat of categories) {
    await Category.create(cat);
  }

  console.log("✔ Categories seeded successfully!");
  process.exit();
}

seedCategories();
