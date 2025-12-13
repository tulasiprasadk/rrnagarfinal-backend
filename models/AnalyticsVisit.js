module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AnalyticsVisit', {
    path: DataTypes.STRING,
    referrer: DataTypes.STRING,
    ip: DataTypes.STRING,
    userAgent: DataTypes.STRING
  });
};
