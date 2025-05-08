const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/stats', jobController.getJobStats);
router.get('/featured', jobController.getFeaturedJobs);
router.get('/latest', jobController.getLatestJobs);
router.get('/today', jobController.getTodayJobs);
router.get('/search', jobController.searchJobs);
router.get('/company/:company', jobController.getCompanyInfo);
router.get('/:id/timeline', jobController.getApplicationTimeline);
router.get('/:id', jobController.getJobDetails);
router.get('/', jobController.getAllJobs);

// Protected routes
router.post('/:id/apply', protect, jobController.submitApplication);
router.post('/:id/save', protect, jobController.toggleSaveJob);
router.post('/:id/quick-apply', protect, jobController.quickApply);

// Admin routes
router.post('/', jobController.createJob);
router.put('/:id', protect, jobController.updateJob);
router.delete('/:id', protect, jobController.deleteJob);
router.patch('/:id/feature', protect, jobController.toggleFeatured);

module.exports = router; 