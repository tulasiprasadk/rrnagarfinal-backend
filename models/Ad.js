module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Ad', {
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    link: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    position: {
      type: DataTypes.STRING, // home_top, home_bottom, sidebar, etc.
      allowNull: true
    }
  });
};
