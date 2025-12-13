const { Sequelize } = require('sequelize');
const path = require('path');

module.exports = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(process.cwd(), 'rrnagar.sqlite'),
  logging: false,
  dialectOptions: {
    // Enable UTF-8 for proper Kannada character support
    charset: 'utf8mb4'
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
});
