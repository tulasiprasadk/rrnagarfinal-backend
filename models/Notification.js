module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Notification", {
    type: {
      type: DataTypes.STRING, // e.g., "order_created", "payment_submitted"
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  });
};
