module.exports = (sequelize, DataTypes) => {
  const ProfilLahan = sequelize.define('ProfilLahan', {
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
    koordinat_center: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: true
    },
    polygon_batas: {
      type: DataTypes.GEOMETRY('POLYGON', 4326),
      allowNull: true
    },
    luas: {
      type: DataTypes.DOUBLE,
      allowNull: true
    }
  }, {
    tableName: 'profil_lahan',
    timestamps: true
  });

  return ProfilLahan;
};
