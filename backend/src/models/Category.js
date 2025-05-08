'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      Category.hasMany(models.Job, {
        foreignKey: 'categoryId',
        as: 'jobs'
      });
    }
  }
  
  Category.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true
    },
    jobCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'job_count'
    },
    popularSearches: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'popular_searches'
    },
    isPopular: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_popular'
    }
  }, {
    sequelize,
    modelName: 'Category',
    tableName: 'categories',
    underscored: true,
    hooks: {
      beforeValidate: (category) => {
        if (category.name && !category.slug) {
          category.slug = category.name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        }
      }
    }
  });
  
  return Category;
}; 