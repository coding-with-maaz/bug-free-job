const { Job, Category, Application, User } = require('../models');
const { Op, Sequelize } = require('sequelize');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const sequelize = require('sequelize');
const multer = require('multer');
const path = require('path');

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/resumes');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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

// Get all jobs with advanced filters
exports.getAllJobs = catchAsync(async (req, res) => {
  const {
    search,
    category,
    type,
    location,
    experience,
    featured,
    minSalary,
    maxSalary,
    tags,
    page = 1,
    limit = 10,
    sortBy = 'postedAt',
    sortOrder = 'DESC'
  } = req.query;

  const where = { isActive: true };
  
  // Search in title, company, description
  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { company: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } }
    ];
  }

  // Category filter
  if (category) {
    where.categoryId = category;
  }

  // Job type filter
  if (type) {
    where.type = type;
  }

  // Location filter
  if (location) {
    where.location = { [Op.like]: `%${location}%` };
  }

  // Experience filter
  if (experience) {
    where.experience = experience;
  }

  // Featured filter
  if (featured === 'true') {
    where.isFeatured = true;
  }

  // Salary range filter
  if (minSalary || maxSalary) {
    where.salary = {};
    if (minSalary) {
      where.salary[Op.gte] = minSalary;
    }
    if (maxSalary) {
      where.salary[Op.lte] = maxSalary;
    }
  }

  // Tags filter
  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    where.tags = { [Op.overlap]: tagArray };
  }

  const offset = (page - 1) * limit;

  const { count, rows: jobs } = await Job.findAndCountAll({
    where,
    include: [{
      model: Category,
      as: 'category',
      attributes: ['name', 'icon', 'color']
    }],
    order: [
      ['isFeatured', 'DESC'],
      [sortBy, sortOrder]
    ],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  // Get available filters
  const availableTypes = await Job.findAll({
    attributes: ['type'],
    group: ['type'],
    raw: true
  });

  const availableLocations = await Job.findAll({
    attributes: ['location'],
    group: ['location'],
    raw: true
  });

  const availableTags = await Job.findAll({
    attributes: ['tags'],
    raw: true
  });

  // Flatten and unique tags
  const uniqueTags = [...new Set(
    availableTags
      .map(job => job.tags)
      .flat()
      .filter(Boolean)
  )];

  res.status(200).json({
    status: 'success',
    data: jobs,
    pagination: {
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    },
    filters: {
      types: availableTypes.map(t => t.type),
      locations: availableLocations.map(l => l.location),
      tags: uniqueTags
    }
  });
});

// Get job statistics
exports.getJobStats = catchAsync(async (req, res) => {
  const totalJobs = await Job.count({ where: { isActive: true } });
  const featuredJobs = await Job.count({ 
    where: { isActive: true, isFeatured: true } 
  });
  
  const jobsByType = await Job.findAll({
    attributes: ['type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    where: { isActive: true },
    group: ['type'],
    raw: true
  });

  const jobsByLocation = await Job.findAll({
    attributes: ['location', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    where: { isActive: true },
    group: ['location'],
    raw: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      totalJobs,
      featuredJobs,
      jobsByType,
      jobsByLocation
    }
  });
});

// Get featured jobs
exports.getFeaturedJobs = catchAsync(async (req, res) => {
  const jobs = await Job.findAll({
    where: {
      isActive: true,
      isFeatured: true
    },
    include: [{
      model: Category,
      as: 'category',
      attributes: ['name', 'icon', 'color']
    }],
    order: [['postedAt', 'DESC']],
    limit: 5
  });

  res.status(200).json({
    status: 'success',
    data: jobs
  });
});

// Get job by ID
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [{
        model: Category,
        attributes: ['name', 'icon', 'color']
      }]
    });

    if (!job) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Job not found' 
      });
    }

    res.status(200).json({
      status: 'success',
      data: job
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
};

// Get today's jobs
exports.getTodayJobs = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  // For testing purposes, if no jobs are found for today, return the latest jobs
  const { count, rows: jobs } = await Job.findAndCountAll({
    where: {
      isActive: true
    },
    order: [['postedAt', 'DESC']],
    include: [{
      model: Category,
      as: 'category',
      attributes: ['name', 'icon', 'color']
    }],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.status(200).json({
    status: 'success',
    data: jobs,
    pagination: {
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      hasMore: parseInt(page) < Math.ceil(count / limit)
    }
  });
});

// Get jobs by category
exports.getJobsByCategory = catchAsync(async (req, res) => {
  const { categoryId } = req.params;
  const { type, search, page = 1, limit = 10 } = req.query;

  // Build where clause
  const where = { 
    categoryId,
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

  res.status(200).json({
    status: 'success',
    data: jobs,
    pagination: {
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    }
  });
});

// Get job details
exports.getJobDetails = catchAsync(async (req, res) => {
  const job = await Job.findByPk(req.params.id, {
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['name', 'icon', 'color']
      },
      {
        model: Application,
        as: 'applications'
      }
    ]
  });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: job
  });
});

// Create job
exports.createJob = catchAsync(async (req, res) => {
  // Check if category exists
  const category = await Category.findByPk(req.body.categoryId);
  if (!category) {
    console.error('Category not found:', req.body.categoryId);
    const allCategories = await Category.findAll({
      attributes: ['id', 'name']
    });
    console.error('Available categories:', allCategories.map(cat => ({ id: cat.id, name: cat.name })));
    throw new AppError('Category not found', 404);
  }

  const job = await Job.create({
    title: req.body.title,
    company: req.body.company,
    location: req.body.location,
    description: req.body.description,
    requirements: req.body.requirements,
    salary: req.body.salary,
    type: req.body.type,
    categoryId: req.body.categoryId,
    isActive: req.body.isActive,
    isFeatured: req.body.isFeatured,
    quickApplyEnabled: req.body.quickApplyEnabled
  });

  // Verify job was created with category
  const createdJob = await Job.findByPk(job.id, {
    include: [{
      model: Category,
      as: 'category'
    }]
  });

  if (!createdJob) {
    throw new AppError('Failed to create job', 500);
  }

  res.status(201).json({
    status: 'success',
    data: createdJob
  });
});

// Update job
exports.updateJob = catchAsync(async (req, res) => {
  const job = await Job.findByPk(req.params.id);

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  await job.update(req.body);

  res.status(200).json({
    status: 'success',
    data: job
  });
});

// Delete job
exports.deleteJob = catchAsync(async (req, res) => {
  const job = await Job.findByPk(req.params.id);

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  await job.destroy();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Toggle job featured status (admin only)
exports.toggleFeatured = catchAsync(async (req, res) => {
  const job = await Job.findByPk(req.params.id);
  
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  await job.update({ isFeatured: !job.isFeatured });
  
  res.status(200).json({
    status: 'success',
    data: job
  });
});

// Save/unsave job
exports.toggleSaveJob = catchAsync(async (req, res) => {
  const job = await Job.findByPk(req.params.id);
  
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  const userId = req.user.id;
  const isSaved = await job.hasSavedBy(userId);

  if (isSaved) {
    await job.removeSavedBy(userId);
  } else {
    await job.addSavedBy(userId);
  }

  res.status(200).json({
    status: 'success',
    data: {
      saved: !isSaved
    }
  });
});

// Quick apply to job
exports.quickApply = catchAsync(async (req, res) => {
  const job = await Job.findByPk(req.params.id);
  
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  if (!job.quickApplyEnabled) {
    throw new AppError('Quick apply is not enabled for this job', 400);
  }

  // Check if user has already applied
  const existingApplication = await Application.findOne({
    where: {
      jobId: job.id,
      userId: req.user.id
    }
  });

  if (existingApplication) {
    throw new AppError('You have already applied to this job', 400);
  }

  // Create application
  const application = await Application.create({
    jobId: job.id,
    userId: req.user.id,
    status: 'pending',
    quickApply: true
  });

  res.status(201).json({
    status: 'success',
    data: application
  });
});

// Search jobs
exports.searchJobs = catchAsync(async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    throw new AppError('Search query is required', 400);
  }

  const jobs = await Job.findAll({
    where: {
      [Op.or]: [
        { title: { [Op.like]: `%${q}%` } },
        { company: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
        { tags: { [Op.like]: `%${q}%` } }
      ],
      isActive: true
    },
    include: [
      {
      model: Category,
      as: 'category',
      attributes: ['name', 'icon', 'color']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({
    status: 'success',
    count: jobs.length,
    data: jobs
  });
});

// Submit job application
exports.submitApplication = catchAsync(async (req, res) => {
  const { jobId } = req.params;
  const { fullName, email, phone, experience, coverLetter } = req.body;

  // Validate required fields
  if (!fullName || !email || !phone || !experience || !coverLetter) {
    throw new AppError('All fields are required', 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400);
  }

  // Validate phone format
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  if (!phoneRegex.test(phone)) {
    throw new AppError('Invalid phone number format', 400);
  }

  // Check if job exists and is active
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }
  if (!job.isActive) {
    throw new AppError('This job is no longer active', 400);
  }

  // Check if user has already applied
  const existingApplication = await Application.findOne({
    where: {
      jobId,
      email
    }
  });

  if (existingApplication) {
    throw new AppError('You have already applied to this job', 400);
  }

  // Handle resume upload
  upload(req, res, async (err) => {
    if (err) {
      throw new AppError(err.message, 400);
    }

    // Create application
    const application = await Application.create({
      jobId,
      fullName,
      email,
      phone,
      experience,
      coverLetter,
      resume: req.file ? req.file.path : null,
      status: 'pending'
    });

    res.status(201).json({
      status: 'success',
      data: application
    });
  });
});

// Get application timeline
exports.getApplicationTimeline = catchAsync(async (req, res) => {
  const { jobId } = req.params;

  const job = await Job.findByPk(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  const timeline = {
    postedDate: job.postedAt,
    lastDateToApply: new Date(job.postedAt.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days from posted date
    totalApplications: await Application.count({ where: { jobId } }),
    status: job.isActive ? 'active' : 'closed'
  };

  res.status(200).json({
    status: 'success',
    data: timeline
  });
});

// Get company information
exports.getCompanyInfo = catchAsync(async (req, res) => {
  const { company } = req.params;

  const jobs = await Job.findAll({
    where: {
      company: { [Op.like]: `%${company}%` },
      isActive: true
    },
    attributes: [
      'company',
      'location',
      'companyLogo',
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalJobs'],
      [sequelize.fn('AVG', sequelize.col('salary')), 'averageSalary']
    ],
    group: ['company', 'location', 'companyLogo']
  });

  if (jobs.length === 0) {
    throw new AppError('Company not found', 404);
  }

  const companyInfo = {
    name: jobs[0].company,
    location: jobs[0].location,
    logo: jobs[0].companyLogo,
    totalJobs: parseInt(jobs[0].getDataValue('totalJobs')),
    averageSalary: parseFloat(jobs[0].getDataValue('averageSalary')),
    jobTypes: await Job.findAll({
      where: {
        company: { [Op.like]: `%${company}%` },
        isActive: true
      },
      attributes: ['type'],
      group: ['type'],
      raw: true
    })
  };

  res.status(200).json({
    status: 'success',
    data: companyInfo
  });
});

// Get latest jobs
exports.getLatestJobs = catchAsync(async (req, res) => {
  const jobs = await Job.findAll({
    where: {
      isActive: true
    },
    include: [{
      model: Category,
      as: 'category',
      attributes: ['name', 'icon', 'color']
    }],
    order: [['postedAt', 'DESC']],
    limit: 10
  });

  res.status(200).json({
    status: 'success',
    data: jobs
  });
}); 