const { Sequelize } = require('sequelize');
const path = require('path');

module.exports = new Sequelize('rrnagar_local', 'postgres', 'whatsthepassword', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
});
