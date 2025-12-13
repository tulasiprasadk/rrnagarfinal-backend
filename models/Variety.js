// backend/models/Variety.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Variety', {
    name: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    subVarieties: { 
      type: DataTypes.JSON, 
      defaultValue: [] 
    }, // Array of subvariety names
    metadata: { 
      type: DataTypes.JSON, 
      defaultValue: {} 
    } // Additional info like units, price ranges, etc
  });
};
