module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sensor_data', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      kelembaban: {
        type: Sequelize.DOUBLE,
        allowNull: false
      },
      pH: {
        type: Sequelize.DOUBLE,
        allowNull: false
      },
      N: {
        type: Sequelize.DOUBLE,
        allowNull: false
      },
      P: {
        type: Sequelize.DOUBLE,
        allowNull: false
      },
      K: {
        type: Sequelize.DOUBLE,
        allowNull: false
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
    await queryInterface.dropTable('sensor_data');
  }
};
