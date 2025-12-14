const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { getLeaderboard, streamLeaderboard } = require('../controllers/leaderboardController');

router.get('/', authenticateToken, getLeaderboard);
router.get('/stream', streamLeaderboard);

module.exports = router;

