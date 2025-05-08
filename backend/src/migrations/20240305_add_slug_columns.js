'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add slug column to categories table
    await queryInterface.addColumn('categories', 'slug', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });

    // Add slug column to jobs table
    await queryInterface.addColumn('jobs', 'slug', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });

    // Update existing records to have slugs
    const categories = await queryInterface.sequelize.query(
      'SELECT id, name FROM categories',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const category of categories) {
      const slug = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await queryInterface.sequelize.query(
        'UPDATE categories SET slug = ? WHERE id = ?',
        {
          replacements: [slug, category.id],
          type: queryInterface.sequelize.QueryTypes.UPDATE
        }
      );
    }

    const jobs = await queryInterface.sequelize.query(
      'SELECT id, title FROM jobs',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const job of jobs) {
      const slug = job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await queryInterface.sequelize.query(
        'UPDATE jobs SET slug = ? WHERE id = ?',
        {
          replacements: [slug, job.id],
          type: queryInterface.sequelize.QueryTypes.UPDATE
        }
      );
    }

    // Make slug columns not null after populating them
    await queryInterface.changeColumn('categories', 'slug', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });

    await queryInterface.changeColumn('jobs', 'slug', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('categories', 'slug');
    await queryInterface.removeColumn('jobs', 'slug');
  }
}; 