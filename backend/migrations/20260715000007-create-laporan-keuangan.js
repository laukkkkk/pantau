module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('laporan_keuangan', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      siklus_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'siklus_tanam',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      total_pendapatan: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      total_biaya: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      keuntungan: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      hpp: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      tanggal_laporan: {
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
    await queryInterface.dropTable('laporan_keuangan');
  }
};
