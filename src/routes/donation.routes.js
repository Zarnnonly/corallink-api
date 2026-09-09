const express = require('express');
const router = express.Router();
const { createDonation, getMyDonations } = require('../controllers/donation.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.post('/', authenticate, requireRole('investor'), createDonation);
router.get('/saya', authenticate, requireRole('investor'), getMyDonations);

module.exports = router;
