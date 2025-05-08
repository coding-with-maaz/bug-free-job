const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { validateCategory } = require('../middleware/validator');
const {
  getAllCategories,
  getPopularCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  togglePopular,
  getCategoryStats,
  getJobsByCategory
} = require('../controllers/categoryController');
const { Category } = require('../models');

// Public routes
router.get('/', getAllCategories);
router.get('/popular', getPopularCategories);
router.get('/stats', getCategoryStats);
router.get('/:id', getCategoryById);
router.get('/:id/jobs', getJobsByCategory);
router.get('/all', async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ['id', 'name', 'icon', 'color', 'isPopular']
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Allow public access for category creation
router.post('/', validateCategory, createCategory);

// Protected routes (admin only)
router.put('/:id', protect, restrictTo('admin'), validateCategory, updateCategory);
router.delete('/:id', protect, restrictTo('admin'), deleteCategory);
router.patch('/:id/popular', protect, restrictTo('admin'), togglePopular);

module.exports = router; 