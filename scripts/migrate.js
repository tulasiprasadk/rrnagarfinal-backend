const sequelize = require('../config/database');

(async () => {
  try {
    const alter = (process.env.MIGRATE_ALTER || 'true') === 'true';
    console.log('Starting DB migrate. alter=', alter);
    await sequelize.sync({ alter });
    console.log('Database migrated successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
