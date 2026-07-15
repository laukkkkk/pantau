module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('deteksi_hama', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nama_hama: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tingkat_bahaya: {
        type: Sequelize.STRING,
        allowNull: false
      },
      koordinat: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        allowNull: true
      },
      foto_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      timestamp: {
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
    await queryInterface.dropTable('deteksi_hama');
  }
};
