module.exports = (sequelize, DataTypes) => {
  const Address = sequelize.define("Address", {
    name: DataTypes.STRING,
    phone: DataTypes.STRING,
    pincode: DataTypes.STRING,
    addressLine: DataTypes.STRING,
    city: DataTypes.STRING,
    state: DataTypes.STRING,
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  });

  return Address;
};
