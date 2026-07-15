module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('rekomendasi_pupuk', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      kandungan_sensor: {
        type: Sequelize.JSON,
        allowNull: false
      },
      rekomendasi: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      dosis: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tanggal: {
        type: Sequelize.DATE,
        allowNull: false
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
    await queryInterface.dropTable('rekomendasi_pupuk');
  }
};
