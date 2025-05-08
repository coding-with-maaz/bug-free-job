const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateUser } = require('../middleware/validator');
const {
  register,
  login,
  getProfile,
  updateProfile
} = require('../controllers/userController');

// Register a new user
router.post('/register', validateUser, register);

// Login user
router.post('/login', login);

// Get current user profile
router.get('/profile', protect, getProfile);

// Update user profile
router.patch('/profile', protect, updateProfile);

module.exports = router; 