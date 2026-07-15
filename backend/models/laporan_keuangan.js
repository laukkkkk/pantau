module.exports = (sequelize, DataTypes) => {
  const LaporanKeuangan = sequelize.define('LaporanKeuangan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    siklus_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'siklus_tanam',
        key: 'id'
      }
    },
    total_pendapatan: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    total_biaya: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    keuntungan: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    hpp: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    tanggal_laporan: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'laporan_keuangan',
    timestamps: true
  });

  LaporanKeuangan.associate = (models) => {
    LaporanKeuangan.belongsTo(models.SiklusTanam, {
      foreignKey: 'siklus_id',
      as: 'siklus_tanam'
    });
  };

  return LaporanKeuangan;
};
