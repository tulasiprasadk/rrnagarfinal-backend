/**
 * backend/models/customer.js
 * Customer model – FIXED with persistent OTP support
 */

module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define(
    "Customer",
    {
      mobile: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },

      username: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        comment: "Phone number as username for easy login",
      },

      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      /* =============================
         ✅ OTP (PERSISTENT STORAGE)
         ============================= */

      otpCode: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Last generated OTP for email login",
      },

      otpExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "OTP expiry timestamp",
      },
    },
    {
      tableName: "customers",
      timestamps: true,
    }
  );

  return Customer;
};
