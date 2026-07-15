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
    tanaman: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tanggal_mulai: {
      type: DataTypes.DATE,
      allowNull: false
    },
    tanggal_selesai: {
      type: DataTypes.DATE,
      allowNull: true
    },
    hasil_panen: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'berjalan'
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
