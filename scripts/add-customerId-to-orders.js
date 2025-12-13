const { sequelize } = require('../models');

(async () => {
  try {
    await sequelize.query('ALTER TABLE Orders ADD COLUMN customerId INTEGER');
    console.log('customerId column added to Orders');
  } catch (e) {
    console.error('Alter error:', e.message);
  } finally {
    process.exit();
  }
})();
