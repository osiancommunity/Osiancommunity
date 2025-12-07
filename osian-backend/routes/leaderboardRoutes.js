const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { getLeaderboard } = require('../controllers/leaderboardController');

router.get('/', authenticateToken, getLeaderboard);

module.exports = router;

