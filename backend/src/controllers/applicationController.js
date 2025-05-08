const { Application, Job, User } = require('../models');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { promisify } = require('util');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only PDF and Word documents are allowed.', 400), false);
    }
  }
}).single('resume');

// @desc    Get all applications
// @route   GET /api/applications
// @access  Private
exports.getApplications = catchAsync(async (req, res) => {
  const { status, jobId, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const where = {};
  if (status) where.status = status;
  if (jobId) where.jobId = jobId;
  if (req.user.role === 'user') where.userId = req.user.id;

  const applications = await Application.findAndCountAll({
    where,
    include: [
      {
        model: Job,
        attributes: ['title', 'company', 'location', 'type']
      },
      {
        model: User,
        attributes: ['name', 'email']
      }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({
    status: 'success',
    data: {
      applications: applications.rows,
      total: applications.count,
      page: parseInt(page),
      pages: Math.ceil(applications.count / limit)
    }
  });
});

// @desc    Get single application
// @route   GET /api/applications/:id
// @access  Private
exports.getApplication = catchAsync(async (req, res) => {
  const application = await Application.findByPk(req.params.id, {
    include: [
      {
        model: Job,
        attributes: ['title', 'company', 'location', 'type', 'description']
      },
      {
        model: User,
        attributes: ['name', 'email']
      }
    ]
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  // Check if user owns the application or is admin/employer
  if (application.userId !== req.user.id && !['admin', 'employer'].includes(req.user.role)) {
    throw new AppError('Not authorized to view this application', 403);
  }

  res.status(200).json({
    status: 'success',
    data: application
  });
});

// @desc    Create new application
// @route   POST /api/applications
// @access  Private
exports.createApplication = catchAsync(async (req, res) => {
  // Handle file upload
  await promisify(upload)(req, res);

  const { jobId, fullName, email, phone, experience, coverLetter } = req.body;

  // Check if job exists
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  // Check if user has already applied
  const existingApplication = await Application.findOne({
    where: {
      jobId,
      userId: req.user.id
    }
  });

  if (existingApplication) {
    throw new AppError('You have already applied for this job', 400);
  }

  let resumeUrl = null;
  if (req.file) {
    // Upload resume to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.buffer.toString('base64'), {
      resource_type: 'raw',
      folder: 'resumes',
      format: req.file.mimetype === 'application/pdf' ? 'pdf' : 'docx'
    });
    resumeUrl = result.secure_url;
  }

  const application = await Application.create({
    jobId,
    userId: req.user.id,
    fullName,
    email,
    phone,
    experience,
    coverLetter,
    resume: resumeUrl,
    status: 'pending'
  });

  res.status(201).json({
    status: 'success',
    data: application
  });
});

// @desc    Update application status
// @route   PATCH /api/applications/:id/status
// @access  Private (Admin/Employer)
exports.updateApplicationStatus = catchAsync(async (req, res) => {
  const { status } = req.body;

  if (!['pending', 'reviewed', 'shortlisted', 'rejected'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const application = await Application.findByPk(req.params.id, {
    include: [{ model: Job }]
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  // Check if user is the employer of the job
  if (req.user.role === 'employer' && application.Job.userId !== req.user.id) {
    throw new AppError('Not authorized to update this application', 403);
  }

  await application.update({ status });

  res.status(200).json({
    status: 'success',
    data: application
  });
});

// @desc    Delete application
// @route   DELETE /api/applications/:id
// @access  Private (Admin/Employer)
exports.deleteApplication = catchAsync(async (req, res) => {
  const application = await Application.findByPk(req.params.id, {
    include: [{ model: Job }]
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  // Check if user is the employer of the job
  if (req.user.role === 'employer' && application.Job.userId !== req.user.id) {
    throw new AppError('Not authorized to delete this application', 403);
  }

  await application.destroy();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Get job applications
// @route   GET /api/applications/job/:jobId
// @access  Private
exports.getJobApplications = catchAsync(async (req, res) => {
  const { jobId } = req.params;

  const applications = await Application.findAll({
    where: { jobId },
    include: [
      {
        model: User,
        attributes: ['name', 'email']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({
    status: 'success',
    data: applications
  });
}); 