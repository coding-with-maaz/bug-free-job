const Category = require('../models/Category');
const Job = require('../models/Job');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

// Get all categories with search
exports.getAllCategories = async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};

    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const categories = await Category.findAll({
      where,
      attributes: {
        include: [
          [
            sequelize.literal('(SELECT COUNT(*) FROM jobs WHERE jobs.category_id = Category.id AND jobs.is_active = true)'),
            'activeJobCount'
          ]
        ]
      },
      order: [
        ['isPopular', 'DESC'],
        [sequelize.literal('activeJobCount'), 'DESC']
      ]
    });

    // Transform the data to include job count
    const categoriesWithCount = categories.map(category => {
      const plainCategory = category.get({ plain: true });
      return {
        ...plainCategory,
        jobCount: parseInt(plainCategory.activeJobCount) || 0
      };
    });

    res.status(200).json({
      status: 'success',
      data: categoriesWithCount
    });
  } catch (error) {
    console.error('Error in getAllCategories:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
};

// Get popular categories
exports.getPopularCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { isPopular: true },
      attributes: {
        include: [
          [
            sequelize.literal('(SELECT COUNT(*) FROM jobs WHERE jobs.category_id = Category.id AND jobs.is_active = true)'),
            'activeJobCount'
          ]
        ]
      },
      order: [[sequelize.literal('activeJobCount'), 'DESC']],
      limit: 5
    });

    // Transform the data to include job count
    const categoriesWithCount = categories.map(category => {
      const plainCategory = category.get({ plain: true });
      return {
        ...plainCategory,
        jobCount: parseInt(plainCategory.activeJobCount) || 0
      };
    });

    res.status(200).json({
      status: 'success',
      data: categoriesWithCount
    });
  } catch (error) {
    console.error('Error in getPopularCategories:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [{
        model: Job,
        as: 'jobs',
        attributes: ['id', 'title', 'company', 'location', 'type', 'salary'],
        where: { isActive: true },
        required: false
      }],
      attributes: {
        include: [
          [
            sequelize.literal('(SELECT COUNT(*) FROM jobs WHERE jobs.category_id = Category.id AND jobs.is_active = true)'),
            'activeJobCount'
          ]
        ]
      }
    });

    if (!category) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Category not found' 
      });
    }

    // Transform the data to include job count
    const categoryWithCount = {
      ...category.get({ plain: true }),
      jobCount: parseInt(category.get('activeJobCount')) || 0
    };

    res.status(200).json({
      status: 'success',
      data: categoryWithCount
    });
  } catch (error) {
    console.error('Error in getCategoryById:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
};

// Create new category
exports.createCategory = async (req, res) => {
  try {
    const {
      name,
      icon,
      color,
      popularSearches,
      isPopular
    } = req.body;

    const category = await Category.create({
      name,
      icon,
      color,
      popularSearches,
      isPopular
    });

    res.status(201).json({
      status: 'success',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const {
      name,
      icon,
      color,
      popularSearches,
      isPopular
    } = req.body;

    await category.update({
      name,
      icon,
      color,
      popularSearches,
      isPopular
    });

    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category has jobs
    const jobCount = await Job.count({ where: { categoryId: category.id } });
    if (jobCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with existing jobs' 
      });
    }

    await category.destroy();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle category popular status
exports.togglePopular = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.update({ isPopular: !category.isPopular });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update category job count
exports.updateJobCount = async (categoryId) => {
  try {
    const jobCount = await Job.count({
      where: { 
        categoryId,
        isActive: true
      }
    });

    await Category.update(
      { jobCount },
      { where: { id: categoryId } }
    );
  } catch (error) {
    console.error('Error updating category job count:', error);
  }
};

// Get category statistics
exports.getCategoryStats = async (req, res) => {
  try {
    const totalCategories = await Category.count();
    const popularCategories = await Category.count({ where: { isPopular: true } });
    
    const categoriesByJobCount = await Category.findAll({
      attributes: [
        'name',
        'jobCount',
        [sequelize.fn('COUNT', sequelize.col('jobs.id')), 'activeJobs']
      ],
      include: [{
        model: Job,
        attributes: [],
        where: { isActive: true },
        required: false
      }],
      group: ['Category.id'],
      order: [[sequelize.col('activeJobs'), 'DESC']],
      limit: 5
    });

    res.json({
      totalCategories,
      popularCategories,
      topCategories: categoriesByJobCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get jobs by category ID
exports.getJobsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, search, page = 1, limit = 10 } = req.query;

    // Build where clause
    const where = { 
      categoryId: id,
      isActive: true
    };
    
    // Add type filter
    if (type && type !== 'all') {
      where.type = type;
    }

    // Add search filter
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { company: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } }
      ];
    }

    // Add remote filter
    if (type === 'remote') {
      where.location = { [Op.like]: '%remote%' };
    }

    const offset = (page - 1) * limit;

    const { count, rows: jobs } = await Job.findAndCountAll({
      where,
      order: [['postedAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name', 'icon', 'color']
      }]
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      status: 'success',
      data: {
        jobs,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: totalPages,
          hasMore: page < totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error in getJobsByCategory:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
}; 