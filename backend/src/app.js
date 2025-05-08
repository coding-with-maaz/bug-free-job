const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/database');
const { User, Job, Application, Category } = require('./models');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const AppError = require('./utils/appError');
const slugify = require('slugify');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Compression
app.use(compression());

// Add request logging middleware before routes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);

// Handle undefined routes
app.all('*', (req, res, next) => {
  console.log(`Route not found: ${req.originalUrl}`);
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Error handling middleware
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Always log errors in development
  console.error('Error details:', {
    status: err.status,
    statusCode: err.statusCode,
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params
  });

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production error response
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      // Programming or unknown errors
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong!'
      });
    }
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    // Sync database and seed initial data
    await sequelize.sync({ force: false });
    const firstCategoryId = await seedInitialData();
    console.log(`Server is running on port ${PORT}`);
    console.log(`First category ID: ${firstCategoryId}`);
  } catch (error) {
    console.error('Error starting server:', error);
  }
});

// Function to seed initial data
const seedInitialData = async () => {
  try {
    // First, clear existing categories and jobs
    await Job.destroy({ where: {} });
    await Category.destroy({ where: {} });

    console.log('Creating categories...');
    const categories = [
      {
        name: 'Technology',
        slug: 'technology',
        icon: 'laptop',
        color: '#007AFF',
        jobCount: 0,
        popularSearches: [],
        isPopular: true
      },
      {
        name: 'Design',
        slug: 'design',
        icon: 'brush',
        color: '#FF2D55',
        jobCount: 0,
        popularSearches: [],
        isPopular: true
      },
      {
        name: 'Marketing',
        slug: 'marketing',
        icon: 'megaphone',
        color: '#5856D6',
        jobCount: 0,
        popularSearches: [],
        isPopular: true
      },
      {
        name: 'Sales',
        slug: 'sales',
        icon: 'trending-up',
        color: '#FF9500',
        jobCount: 0,
        popularSearches: [],
        isPopular: false
      },
      {
        name: 'Customer Service',
        slug: 'customer-service',
        icon: 'headset',
        color: '#34C759',
        jobCount: 0,
        popularSearches: [],
        isPopular: false
      }
    ];

    const createdCategories = await Category.bulkCreate(categories, { returning: true });
    console.log('Categories created successfully:', createdCategories.map(cat => ({ id: cat.id, name: cat.name })));

    if (createdCategories.length === 0) {
      throw new Error('Failed to create categories');
    }

    // Get the first category
    const firstCategory = createdCategories[0];
    console.log('First category ID:', firstCategory.id);

    // Create a sample job
    console.log('Creating sample job...');
    const jobTitle = 'Senior React Developer';
    const job = await Job.create({
      title: jobTitle,
      slug: slugify(jobTitle, { 
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g
      }),
      company: 'Tech Corp',
      location: 'New York, NY',
      type: 'full-time',
      salary: '120000',
      description: 'Looking for an experienced React developer with strong skills in modern web development. Must have experience with React, Node.js, and TypeScript.',
      requirements: ['5+ years React', 'Node.js experience', 'TypeScript proficiency'],
      categoryId: firstCategory.id,
      isActive: true,
      isFeatured: true,
      quickApplyEnabled: true
    });

    // Verify job was created
    const createdJob = await Job.findByPk(job.id, {
      include: [{
        model: Category,
        as: 'category'
      }]
    });

    if (!createdJob) {
      throw new Error('Failed to create job');
    }

    console.log('Sample job created successfully with category:', createdJob.category.name);
    console.log('Initial data seeding completed');
    return firstCategory.id;
  } catch (error) {
    console.error('Error seeding initial data:', error);
    throw error;
  }
};

module.exports = app; 