'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add slug to categories
    await queryInterface.addColumn('categories', 'slug', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      after: 'name'
    });

    // Add slug to jobs
    await queryInterface.addColumn('jobs', 'slug', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      after: 'title'
    });

    // Create indexes for slugs
    await queryInterface.addIndex('categories', ['slug']);
    await queryInterface.addIndex('jobs', ['slug']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('categories', ['slug']);
    await queryInterface.removeIndex('jobs', ['slug']);

    // Remove columns
    await queryInterface.removeColumn('categories', 'slug');
    await queryInterface.removeColumn('jobs', 'slug');
  }
}; 