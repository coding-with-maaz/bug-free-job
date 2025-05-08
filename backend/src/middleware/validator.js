const { AppError } = require('./errorHandler');
const { body, validationResult } = require('express-validator');

// Basic job validation
const validateJobBasic = (req, res, next) => {
  const { title, company, location, description, requirements } = req.body;

  if (!title || !company || !location || !description || !requirements) {
    return next(new AppError('Please provide all required fields', 400));
  }

  if (title.length < 3) {
    return next(new AppError('Title must be at least 3 characters long', 400));
  }

  if (description.length < 50) {
    return next(new AppError('Description must be at least 50 characters long', 400));
  }

  next();
};

// Application validation
const validateApplication = (req, res, next) => {
  const { jobId, fullName, email, phone, experience, coverLetter } = req.body;

  // Check required fields
  if (!jobId || !fullName || !email || !phone || !experience || !coverLetter) {
    return next(new AppError('All fields are required', 400));
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Invalid email format', 400));
  }

  // Validate phone format
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  if (!phoneRegex.test(phone)) {
    return next(new AppError('Invalid phone number format', 400));
  }

  // Validate experience format
  if (typeof experience !== 'string' || experience.length < 10) {
    return next(new AppError('Experience must be at least 10 characters long', 400));
  }

  // Validate cover letter format
  if (typeof coverLetter !== 'string' || coverLetter.length < 50) {
    return next(new AppError('Cover letter must be at least 50 characters long', 400));
  }

  // Validate resume file
  if (!req.file) {
    return next(new AppError('Resume file is required', 400));
  }

  // Validate file type
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return next(new AppError('Invalid file type. Only PDF and Word documents are allowed.', 400));
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    return next(new AppError('File size too large. Maximum size is 5MB.', 400));
  }

  next();
};

// User validation
const validateUser = (req, res, next) => {
  const { fullName, email, password, phone } = req.body;

  // Check required fields
  if (!fullName || !email || !password || !phone) {
    return next(new AppError('All fields are required', 400));
  }

  // Validate full name
  if (fullName.length < 2 || fullName.length > 50) {
    return next(new AppError('Full name must be between 2 and 50 characters', 400));
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Invalid email format', 400));
  }

  // Validate password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return next(new AppError('Password must be at least 8 characters long and contain uppercase, lowercase, number and special character', 400));
  }

  // Validate phone format
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  if (!phoneRegex.test(phone)) {
    return next(new AppError('Invalid phone number format', 400));
  }

  next();
};

// Category validation rules
const validateCategory = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  
  body('icon')
    .trim()
    .notEmpty()
    .withMessage('Category icon is required')
    .matches(/^[a-z-]+$/)
    .withMessage('Icon must be a valid icon name (lowercase with hyphens)'),
  
  body('color')
    .trim()
    .notEmpty()
    .withMessage('Category color is required')
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code'),
  
  body('popularSearches')
    .optional()
    .isArray()
    .withMessage('Popular searches must be an array')
    .custom((searches) => {
      if (searches && searches.length > 0) {
        return searches.every(search => 
          typeof search === 'string' && 
          search.length >= 2 && 
          search.length <= 50
        );
      }
      return true;
    })
    .withMessage('Each popular search must be a string between 2 and 50 characters'),
  
  body('isPopular')
    .optional()
    .isBoolean()
    .withMessage('isPopular must be a boolean value'),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Job validation rules
const validateJob = (req, res, next) => {
  const { title, company, location, type, description, requirements, salary, categoryId } = req.body;

  // Check required fields
  if (!title || !company || !location || !type || !description || !requirements || !salary || !categoryId) {
    return next(new AppError('All fields are required', 400));
  }

  // Validate title length
  if (title.length < 5 || title.length > 100) {
    return next(new AppError('Title must be between 5 and 100 characters', 400));
  }

  // Validate company name
  if (company.length < 2 || company.length > 50) {
    return next(new AppError('Company name must be between 2 and 50 characters', 400));
  }

  // Validate location
  if (location.length < 3 || location.length > 100) {
    return next(new AppError('Location must be between 3 and 100 characters', 400));
  }

  // Validate job type
  const validTypes = ['full-time', 'part-time', 'contract', 'internship', 'remote'];
  if (!validTypes.includes(type)) {
    return next(new AppError('Invalid job type', 400));
  }

  // Validate description length
  if (description.length < 50 || description.length > 5000) {
    return next(new AppError('Description must be between 50 and 5000 characters', 400));
  }

  // Validate requirements length
  if (requirements.length < 20 || requirements.length > 2000) {
    return next(new AppError('Requirements must be between 20 and 2000 characters', 400));
  }

  // Validate salary
  if (typeof salary !== 'number' || salary < 0) {
    return next(new AppError('Salary must be a positive number', 400));
  }

  next();
};

module.exports = {
  validateJobBasic,
  validateJob,
  validateApplication,
  validateUser,
  validateCategory
}; 