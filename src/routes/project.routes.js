const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getAllProjects, createProject } = require('../controllers/project.controller');

router.get('/', getAllProjects);
router.post('/', authenticate, createProject);

module.exports = router;