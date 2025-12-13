const { sequelize, Product, Category } = require('../models');

(async () => {
  try {
    console.log('Adding categoryId column to Products table...');
    await sequelize.query(`
      ALTER TABLE Products 
      ADD COLUMN categoryId INTEGER DEFAULT 1;
    `);
    console.log('✅ categoryId column added to Products table');

    // Verify the column was added
    const tableInfo = await sequelize.query(`PRAGMA table_info(Products);`);
    const categoryIdColumn = tableInfo[0].find(col => col.name === 'categoryId');
    if (categoryIdColumn) {
      console.log('✅ Column verified:', categoryIdColumn);
    }

  } catch (err) {
    if (err.message.includes('duplicate column')) {
      console.log('✅ categoryId column already exists');
    } else {
      console.error('Error adding column:', err.message);
    }
  } finally {
    process.exit(0);
  }
})();
