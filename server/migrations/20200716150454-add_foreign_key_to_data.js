'use strict';

module.exports = {
  up: (queryInterface, Sequelize, options = {}) => {
    return queryInterface.addColumn('SavedData', 'userId', {
      type: Sequelize.INTEGER
    }, options)
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
  },

  down: (queryInterface, Sequelize, options = {}) => {
    return queryInterface.removeColumn("SavedData", "userId", options)
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
  }
};
