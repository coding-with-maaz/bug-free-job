const User = require('./User');
const Job = require('./Job');
const Application = require('./Application');
const Category = require('./Category');

// User-Job associations (saved jobs)
User.belongsToMany(Job, { 
  through: 'SavedJobs',
  as: 'savedJobs',
  foreignKey: 'userId',
  otherKey: 'jobId'
});
Job.belongsToMany(User, { 
  through: 'SavedJobs',
  as: 'savedBy',
  foreignKey: 'jobId',
  otherKey: 'userId'
});

// Job-Category association
Job.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category'
});
Category.hasMany(Job, {
  foreignKey: 'categoryId',
  as: 'jobs'
});

// Job-Application associations
Job.hasMany(Application, {
  foreignKey: 'jobId',
  as: 'applications'
});
Application.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job'
});

// User-Application associations
User.hasMany(Application, {
  foreignKey: 'userId',
  as: 'applications'
});
Application.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Add hooks to update category job count
Job.afterCreate(async (job) => {
  const category = await Category.findByPk(job.categoryId);
  if (category) {
    await category.increment('jobCount');
  }
});

Job.afterDestroy(async (job) => {
  const category = await Category.findByPk(job.categoryId);
  if (category) {
    await category.decrement('jobCount');
  }
});

module.exports = {
  User,
  Job,
  Application,
  Category
}; 