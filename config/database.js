const { Sequelize } = require('sequelize');

// Prefer DATABASE_URL in production (Vercel / Supabase). Fall back to local Postgres or SQLite.

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION || null;

// If a DATABASE_URL/PG_CONNECTION is provided, use Postgres with optional SSL
if (connectionString) {
  const dbSslEnv = (process.env.DB_SSL || '').toLowerCase();
  const useSsl = dbSslEnv === 'true' || connectionString.includes('sslmode=require');

  const sequelizeOptions = {
    dialect: 'postgres',
    logging: false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  };

  if (useSsl) {
    sequelizeOptions.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: (process.env.DB_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() !== 'true' ? false : true
      }
    };
  }

  module.exports = new Sequelize(connectionString, sequelizeOptions);
} else {
  // No external DB configured — use SQLite for quick local development
  const storage = process.env.SQLITE_FILE || 'database.sqlite';
  module.exports = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  });
}
