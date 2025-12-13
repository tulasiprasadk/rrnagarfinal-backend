const { Product, Supplier, Category, sequelize } = require("../models");

async function seed() {
  await sequelize.sync({ alter: true });

  const supplier = await Supplier.create({
    name: "Default Supplier",
    phone: "9999999999"
  });

  const category = await Category.create({
    name: "Electronics"
  });

  await Product.create({
    title: "Sample Phone",
    description: "This is a demo phone.",
    price: 9999,
    SupplierId: supplier.id,
    CategoryId: category.id
  });

  console.log("Product seeded!");
  process.exit();
}

seed();
