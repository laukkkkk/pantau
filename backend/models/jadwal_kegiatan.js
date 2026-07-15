module.exports = (sequelize, DataTypes) => {
  const JadwalKegiatan = sequelize.define('JadwalKegiatan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    nama_kegiatan: {
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
      defaultValue: 'BELUM_MULAI'
    },
    deskripsi: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'jadwal_kegiatan',
    timestamps: true
  });

  return JadwalKegiatan;
};
