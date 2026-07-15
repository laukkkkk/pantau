module.exports = (sequelize, DataTypes) => {
  const SensorData = sequelize.define('SensorData', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    kelembaban: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    pH: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    N: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    P: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    K: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'sensor_data',
    timestamps: true
  });

  return SensorData;
};
