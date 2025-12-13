module.exports = (sequelize, DataTypes) => {
  return sequelize.define('StockHistory', {
  
    change: {
      type: DataTypes.INTEGER, // +10, -5 etc.
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });
};
