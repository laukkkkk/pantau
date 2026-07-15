module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('profil_lahan', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nama: {
        type: Sequelize.STRING,
        allowNull: false
      },
      koordinat_center: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        allowNull: true
      },
      polygon_batas: {
        type: Sequelize.GEOMETRY('POLYGON', 4326),
        allowNull: true
      },
      luas: {
        type: Sequelize.DOUBLE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('profil_lahan');
  }
};
