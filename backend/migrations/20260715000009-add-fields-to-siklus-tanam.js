module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('siklus_tanam', 'tanaman', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('siklus_tanam', 'hasil_panen', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('siklus_tanam', 'tanaman');
    await queryInterface.removeColumn('siklus_tanam', 'hasil_panen');
  }
};
