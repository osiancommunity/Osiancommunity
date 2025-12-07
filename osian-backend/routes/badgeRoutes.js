const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { getMyBadges } = require('../controllers/badgeController');

router.get('/me', authenticateToken, getMyBadges);

module.exports = router;

