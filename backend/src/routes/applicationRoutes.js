const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, restrictTo } = require('../middleware/auth');
const { validateApplication } = require('../middleware/validator');
const {
  createApplication,
  getUserApplications,
  getJobApplications,
  updateApplicationStatus,
  getApplication,
  getApplications,
  deleteApplication
} = require('../controllers/applicationController');
const catchAsync = require('../utils/catchAsync');
const { Application } = require('../models');
const AppError = require('../utils/appError');
const { Job } = require('../models');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.post('/', protect, createApplication);

// Protected routes
router.use(protect);

// Get job applications (for employers) - must come before /:id routes
router.get('/job/:jobId', restrictTo('admin', 'employer'), getJobApplications);

// Get user's applications
router.get('/my-applications', catchAsync(async (req, res) => {
  const applications = await Application.findAll({
    where: { userId: req.user.id },
    include: [{
      model: Job,
      attributes: ['title', 'company', 'location', 'type']
    }],
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({
    status: 'success',
    data: applications
  });
}));

// General routes
router.get('/', getApplications);
router.get('/:id', getApplication);
router.patch('/:id/status', restrictTo('admin', 'employer'), updateApplicationStatus);
router.delete('/:id', restrictTo('admin', 'employer'), deleteApplication);

// Withdraw application
router.delete('/:id/withdraw', catchAsync(async (req, res) => {
  const application = await Application.findByPk(req.params.id);

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  // Check if user owns the application
  if (application.userId !== req.user.id) {
    throw new AppError('Not authorized to withdraw this application', 403);
  }

  await application.destroy();

  res.status(204).json({
    status: 'success',
    data: null
  });
}));

module.exports = router; 