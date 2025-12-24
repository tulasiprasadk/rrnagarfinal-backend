const { Product, Supplier, Category, sequelize } = require("../models");

async function seed() {

  await sequelize.sync({ alter: true });

  const categories = await Category.findAll();
  if (!categories.length) {
    console.log("No categories found. Please seed categories first.");
    process.exit(1);
  }

  for (const category of categories) {
    try {
      await Product.create({
        title: `Sample Product for ${category.name}`,
        description: `This is a demo product for category ${category.name}.`,
        price: 1000 + Math.floor(Math.random() * 9000),
        CategoryId: category.id,
        status: "approved"
      });
      console.log(`Product seeded for category: ${category.name}`);
    } catch (err) {
      console.error(`Failed to seed product for category: ${category.name}`, err);
    }
  }

  console.log("Product seeded!");
  process.exit();
}

seed();
