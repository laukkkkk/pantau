module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('biaya_produksi', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      kategori: {
        type: Sequelize.STRING,
        allowNull: false
      },
      jumlah: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      tanggal: {
        type: Sequelize.DATE,
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
    await queryInterface.dropTable('biaya_produksi');
  }
};
