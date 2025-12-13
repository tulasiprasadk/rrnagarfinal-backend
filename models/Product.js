module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Product', {
    title: { type: DataTypes.STRING, allowNull: false },
    titleKannada: DataTypes.STRING,  // Kannada translation
    description: DataTypes.TEXT,
    descriptionKannada: DataTypes.TEXT,  // Kannada translation
    price: { type: DataTypes.FLOAT, allowNull: false },
    variety: DataTypes.STRING,      // e.g., "Bound", "Unbound" for flowers
    subVariety: DataTypes.STRING,   // e.g., "Packaged", "Loose" etc.
    unit: DataTypes.STRING,         // e.g., "kg", "piece", "bundle"
    supplierId: DataTypes.INTEGER,  // Optional supplier reference
    isService: { type: DataTypes.BOOLEAN, defaultValue: true },
    deliveryAvailable: { type: DataTypes.BOOLEAN, defaultValue: true },
    isTemplate: { type: DataTypes.BOOLEAN, defaultValue: false }, // Admin templates
    metadata: DataTypes.JSON
  });
};
