module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define(
    "Customer",
    {
      mobile: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        defaultValue: null,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        comment: "Phone number as username for easy login"
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      }
    },
    {
      tableName: "customers",
    }
  );

  return Customer;
};
