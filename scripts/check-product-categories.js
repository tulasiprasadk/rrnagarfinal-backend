const { sequelize, Product } = require('../models');

(async () => {
  try {
    console.log('Checking products for categoryId...');
    
    // Count products without categoryId
    const productsWithoutCategory = await Product.findAll({
      where: { categoryId: [null, 0] },
      attributes: ['id', 'title', 'categoryId']
    });
    
    console.log(`\nProducts without categoryId: ${productsWithoutCategory.length}`);
    if (productsWithoutCategory.length > 0) {
      console.log('Sample products without category:');
      productsWithoutCategory.slice(0, 5).forEach(p => {
        console.log(`  - ID: ${p.id}, Title: ${p.title}, CategoryId: ${p.categoryId}`);
      });
    }
    
    // Get count of products with each category
    const allProducts = await Product.findAll({
      attributes: ['id', 'title', 'categoryId']
    });
    
    const byCategory = {};
    allProducts.forEach(p => {
      const catId = p.categoryId || 'NULL';
      byCategory[catId] = (byCategory[catId] || 0) + 1;
    });
    
    console.log('\nProducts by categoryId:');
    Object.entries(byCategory).forEach(([catId, count]) => {
      console.log(`  categoryId ${catId}: ${count} products`);
    });
    
    // If there are products without category, assign them to category 1 (Flowers)
    if (productsWithoutCategory.length > 0) {
      console.log(`\nAssigning ${productsWithoutCategory.length} products to categoryId 1 (Flowers)...`);
      await sequelize.query(`
        UPDATE Products 
        SET categoryId = 1 
        WHERE categoryId IS NULL OR categoryId = 0;
      `);
      console.log('✅ Products updated');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
