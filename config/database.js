const { Sequelize } = require('sequelize');

// Prefer DATABASE_URL in production (Vercel / Supabase). Fall back to local Postgres.
const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION || null;

// DB_SSL can be set to "true" in Vercel envs to enable TLS with rejectUnauthorized=false
const dbSslEnv = (process.env.DB_SSL || '').toLowerCase();
const useSsl = dbSslEnv === 'true' || (connectionString && connectionString.includes('sslmode=require'));

const sequelizeOptions = {
  dialect: 'postgres',
  logging: false,
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
};

if (useSsl) {
  // Configure TLS for environments like Supabase where SSL is required.
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      // Supabase uses a valid cert but in some serverless environments rejectUnauthorized
      // causes issues; allow override via DB_SSL_REJECT_UNAUTHORIZED
      rejectUnauthorized: (process.env.DB_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() !== 'true' ? false : true
    }
  };
}

let sequelize;
if (connectionString) {
  sequelize = new Sequelize(connectionString, sequelizeOptions);
} else {
  // Local default for development when no DATABASE_URL provided
  sequelize = new Sequelize('rrnagar_local', 'postgres', 'whatsthepassword', Object.assign({
    host: 'localhost'
  }, sequelizeOptions));
}

module.exports = sequelize;
