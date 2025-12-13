const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// Load Models
const Ad = require('./Ad')(sequelize, DataTypes);
const Supplier = require('./Supplier')(sequelize, DataTypes);
const Category = require('./Category')(sequelize, DataTypes);
const Product = require('./Product')(sequelize, DataTypes);
const Order = require('./Order')(sequelize, DataTypes);
const AnalyticsVisit = require('./AnalyticsVisit')(sequelize, DataTypes);
const StockHistory = require('./StockHistory')(sequelize, DataTypes);
const Shop = require('./Shop')(sequelize, DataTypes);
const Customer = require('./Customer')(sequelize, DataTypes);
const Address = require('./Address')(sequelize, DataTypes);   // ✅ ADDED
const Notification = require("./Notification")(sequelize, DataTypes);
const Variety = require('./Variety')(sequelize, DataTypes);

// Junction table for many-to-many Product-Supplier relationship
const ProductSupplier = sequelize.define('ProductSupplier', {
  price: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true
});

/* ===========================
   MODEL RELATIONS
=========================== */

// Many-to-Many: Product ↔ Supplier (through ProductSupplier)
Product.belongsToMany(Supplier, { through: ProductSupplier, as: 'suppliers' });
Supplier.belongsToMany(Product, { through: ProductSupplier, as: 'products' });

// Category → Products
Category.hasMany(Product);
Product.belongsTo(Category);

// Category → Varieties
Category.hasMany(Variety);
Variety.belongsTo(Category);

// Supplier → Orders
Supplier.hasMany(Order);
Order.belongsTo(Supplier);

// Product → Orders
Product.hasMany(Order);
Order.belongsTo(Product);

// Product → Stock History
Product.hasMany(StockHistory);
StockHistory.belongsTo(Product);

// Customer → Orders
Customer.hasMany(Order);              // ✅ ADDED
Order.belongsTo(Customer);            // ✅ ADDED

// Address → Orders (using existing addressId column)
Address.hasMany(Order, { foreignKey: 'addressId', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Order.belongsTo(Address, { foreignKey: 'addressId', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

// Customer → Addresses
Customer.hasMany(Address);            // ✅ ADDED
Address.belongsTo(Customer);          // ✅ ADDED

/* ===========================
   EXPORT MODELS + SEQUELIZE
=========================== */
module.exports = {
  sequelize,
  Ad,
  Supplier,
  Category,
  Product,
  Order,
  AnalyticsVisit,
  StockHistory,
  Shop,
  Customer,
  Address,                             // ✅ ADDED
  Notification,
  Variety,
  ProductSupplier                      // ✅ ADDED
};
