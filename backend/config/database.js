const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  development: {
    use_env_variable: 'DB_URL',
    dialect: 'postgres',
    migrationStorageTableName: 'sequelize_meta',
    seederStorage: 'sequelize'
  },
  test: {
    use_env_variable: 'DB_URL',
    dialect: 'postgres',
    migrationStorageTableName: 'sequelize_meta',
    seederStorage: 'sequelize'
  },
  production: {
    use_env_variable: 'DB_URL',
    dialect: 'postgres',
    migrationStorageTableName: 'sequelize_meta',
    seederStorage: 'sequelize'
  }
};
