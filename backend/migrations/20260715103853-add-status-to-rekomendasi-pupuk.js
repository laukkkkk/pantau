module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('rekomendasi_pupuk', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'BELUM_SELESAI'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('rekomendasi_pupuk', 'status');
  }
};
