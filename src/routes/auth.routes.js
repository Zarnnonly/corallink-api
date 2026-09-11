const express = require('express');
const router = express.Router();
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const { register, login, profile } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', authenticate, asyncHandler(profile));
router.get('/profile', authenticate, asyncHandler(profile));
router.use('/profile/photo', require('./profile-photo.routes'));

module.exports = router;
