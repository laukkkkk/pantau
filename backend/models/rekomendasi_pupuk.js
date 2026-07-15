module.exports = (sequelize, DataTypes) => {
  const RekomendasiPupuk = sequelize.define('RekomendasiPupuk', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    kandungan_sensor: {
      type: DataTypes.JSON,
      allowNull: false
    },
    rekomendasi: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    dosis: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tanggal: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'BELUM_SELESAI'
    }
  }, {
    tableName: 'rekomendasi_pupuk',
    timestamps: true
  });

  return RekomendasiPupuk;
};
