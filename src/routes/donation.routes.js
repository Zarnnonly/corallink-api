const express = require('express');
const router = express.Router();
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const { createDonation, getMyDonations } = require('../controllers/donation.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.post('/', authenticate, requireRole('investor'), asyncHandler(createDonation));
router.get('/saya', authenticate, requireRole('investor'), asyncHandler(getMyDonations));

module.exports = router;
