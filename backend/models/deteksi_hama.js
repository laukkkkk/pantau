module.exports = (sequelize, DataTypes) => {
  const DeteksiHama = sequelize.define('DeteksiHama', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    nama_hama: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tingkat_bahaya: {
      type: DataTypes.STRING,
      allowNull: false
    },
    koordinat: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: true
    },
    foto_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'deteksi_hama',
    timestamps: true
  });

  return DeteksiHama;
};
