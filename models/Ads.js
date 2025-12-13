module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Ad', {
    location: DataTypes.ENUM('top', 'bottom', 'left', 'right'),
    title: DataTypes.STRING,
    url: DataTypes.STRING,
    imageUrl: DataTypes.STRING,
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    order: { type: DataTypes.INTEGER, defaultValue: 0 }
  });
};
