module.exports = (sequelize, DataTypes) => {
  const SiklusTanam = sequelize.define('SiklusTanam', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    nama: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tanggal_mulai: {
      type: DataTypes.DATE,
      allowNull: false
    },
    tanggal_selesai: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'AKTIF'
    }
  }, {
    tableName: 'siklus_tanam',
    timestamps: true
  });

  SiklusTanam.associate = (models) => {
    SiklusTanam.hasMany(models.BiayaProduksi, {
      foreignKey: 'siklus_id',
      as: 'biaya_produksi'
    });
    SiklusTanam.hasMany(models.LaporanKeuangan, {
      foreignKey: 'siklus_id',
      as: 'laporan_keuangan'
    });
  };

  return SiklusTanam;
};
