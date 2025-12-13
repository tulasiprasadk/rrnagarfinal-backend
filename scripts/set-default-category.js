const { Product } = require('../models');

(async () => {
  try {
    const [affected] = await Product.update(
      { categoryId: 1 },
      { where: { categoryId: null } }
    );
    console.log(`Updated ${affected} products to categoryId=1 (Flowers).`);
  } catch (e) {
    console.error('Error updating categories:', e.message);
  } finally {
    process.exit();
  }
})();
