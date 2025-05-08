const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const slugify = require('slugify');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [3, 100]
    }
  },
  slug: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true
  },
  company: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 5000]
    }
  },
  requirements: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      isValidRequirements(value) {
        if (!Array.isArray(value)) {
          throw new Error('Requirements must be an array');
        }
        value.forEach(req => {
          if (typeof req !== 'string' || req.length < 3 || req.length > 200) {
            throw new Error('Each requirement must be a string between 3 and 200 characters');
          }
        });
      }
    }
  },
  salary: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      len: [3, 50]
    }
  },
  type: {
    type: DataTypes.ENUM('full-time', 'part-time', 'contract', 'internship'),
    allowNull: false
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'category_id',
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    validate: {
      isValidTags(value) {
        if (!Array.isArray(value)) {
          throw new Error('Tags must be an array');
        }
        value.forEach(tag => {
          if (typeof tag !== 'string' || tag.length < 2 || tag.length > 30) {
            throw new Error('Each tag must be a string between 2 and 30 characters');
          }
        });
      }
    }
  },
  companyLogo: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'company_logo',
    validate: {
      isUrl: true
    }
  },
  experience: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      len: [2, 50]
    }
  },
  postedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'posted_at'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_featured'
  },
  quickApplyEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'quick_apply_enabled'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'jobs',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeValidate: (job) => {
      if (job.title) {
        job.slug = slugify(job.title, { 
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g
        });
      }
    },
    beforeCreate: async (job) => {
      // Update category job count
      const Category = sequelize.models.Category;
      await Category.increment('jobCount', { where: { id: job.categoryId } });
    },
    beforeUpdate: async (job) => {
      if (job.changed('title')) {
        job.slug = slugify(job.title, { 
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g
        });
      }
    },
    afterDestroy: async (job) => {
      // Update category job count
      const Category = sequelize.models.Category;
      await Category.decrement('jobCount', { where: { id: job.categoryId } });
    }
  }
});

// Instance method to get formatted posted time
Job.prototype.getPostedTime = function() {
  const now = new Date();
  const diff = now - this.postedAt;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else {
    return `${days} days ago`;
  }
};

module.exports = Job; 