// Lightweight CI health check: verifies DB connection (uses SQLite fallback if no DATABASE_URL)
const sequelize = require('./config/database');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connection OK');
    process.exit(0);
  } catch (err) {
    console.error('DB connection failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
