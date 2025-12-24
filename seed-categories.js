const { sequelize, Category } = require('./models');

const categories = [
  { name: 'Groceries', icon: '🛒' },
  { name: 'Flowers', icon: '🌸' },
  { name: 'Local Services', icon: '🛠️' },
  { name: 'Pet Services', icon: '🐾' },
  { name: 'Consultancy', icon: '💼' },
  { name: 'Crackers', icon: '🎆' },
];

async function seed() {
  try {
    await sequelize.sync();
    console.log('✅ DB synced');

    // Clear existing categories
    await Category.destroy({ where: {} });
    console.log('🗑️  Cleared existing categories');

    // Create new categories
    const created = await Category.bulkCreate(categories);
    console.log(`✅ Created ${created.length} categories:`);
    created.forEach(c => console.log(`   - ${c.icon} ${c.name}`));

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

seed();
