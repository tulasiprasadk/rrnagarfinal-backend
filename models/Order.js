module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define("Order", {
    // Customer info will be added via belongsTo relationship
    customerName: DataTypes.STRING,
    customerPhone: DataTypes.STRING,
    customerAddress: DataTypes.TEXT,

    // This is the FK to Address table
    addressId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    // ------------------------------
    // ORDER TYPE
    // ------------------------------
    type: {
      type: DataTypes.ENUM("delivery", "visit"),
      allowNull: true
    },

    // ------------------------------
    // ORDER AMOUNT
    // ------------------------------
    totalAmount: DataTypes.FLOAT,
    platformFee: DataTypes.FLOAT,

    // ------------------------------
    // ORDER STATUS
    // ------------------------------
    status: {
      type: DataTypes.ENUM(
        "created",
        "paid",
        "delivered",
        "cancelled",
        "payment_failed"
      ),
      defaultValue: "created",
    },

    // ------------------------------
    // PAYMENT META
    // ------------------------------
    paymentInfo: DataTypes.JSON,

    // ------------------------------
    // PAYMENT SCREENSHOT & UNR
    // ------------------------------
    paymentScreenshot: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    paymentUNR: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    paymentStatus: {
      type: DataTypes.STRING, // pending / approved / rejected
      defaultValue: "pending",
    }
  });

  return Order;
};
