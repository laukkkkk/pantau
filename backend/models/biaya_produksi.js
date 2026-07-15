module.exports = (sequelize, DataTypes) => {
  const BiayaProduksi = sequelize.define('BiayaProduksi', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    kategori: {
      type: DataTypes.STRING,
      allowNull: false
    },
    jumlah: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    tanggal: {
      type: DataTypes.DATE,
      allowNull: false
    },
    siklus_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'siklus_tanam',
        key: 'id'
      }
    }
  }, {
    tableName: 'biaya_produksi',
    timestamps: true
  });

  BiayaProduksi.associate = (models) => {
    BiayaProduksi.belongsTo(models.SiklusTanam, {
      foreignKey: 'siklus_id',
      as: 'siklus_tanam'
    });
  };

  return BiayaProduksi;
};
