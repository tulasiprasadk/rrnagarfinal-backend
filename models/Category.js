module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Category', {
    name: { type: DataTypes.STRING, allowNull: false },
    icon: { type: DataTypes.STRING, defaultValue: "📦" },
    image: { type: DataTypes.STRING, allowNull: true } // image URL for category
  });
};
