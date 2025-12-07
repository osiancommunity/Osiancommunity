const Result = require('../models/Result');
const User = require('../models/User');
const LeaderboardEntry = require('../models/LeaderboardEntry');
const UserBadge = require('../models/UserBadge');
const { summarizeFromResults } = require('../utils/leaderboard');
let redis;
try {
  const Redis = require('ioredis');
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
  }
} catch (_) {}

function periodToDateRange(period) {
  const now = new Date();
  if (period === '7d') {
    return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
  }
  if (period === '30d') {
    return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
  }
  return { from: null, to: null };
}

async function rebuildScopeLeaderboard({ scope, scopeRef, quizId, period }) {
  const { from, to } = periodToDateRange(period);
  const match = { status: 'completed' };
  if (quizId) match.quizId = quizId;
  if (from && to) match.completedAt = { $gte: from, $lte: to };

  // Batch scope uses User.profile.year as grouping key
  let pipe = [
    { $match: match },
    {
      $group: {
        _id: '$userId',
        results: { $push: { score: '$score', totalQuestions: '$totalQuestions' } },
        attempts: { $sum: 1 }
      }
    }
  ];
  const userAgg = await Result.aggregate(pipe);
  const leaderboardDocs = [];
  for (const u of userAgg) {
    const summary = summarizeFromResults(u.results);
    leaderboardDocs.push({
      updateOne: {
        filter: {
          userId: u._id,
          scope,
          scopeRef: scope === 'batch' ? (scopeRef || null) : null,
          quizId: quizId || null,
          period
        },
        update: {
          $set: {
            userId: u._id,
            scope,
            scopeRef: scope === 'batch' ? (scopeRef || null) : null,
            quizId: quizId || null,
            period,
            avgScore: summary.avgScorePct,
            accuracy: summary.accuracyPct,
            attempts: summary.attempts,
            compositeScore: summary.composite,
            updatedAt: new Date()
          }
        },
        upsert: true
      }
    });
  }
  if (leaderboardDocs.length > 0) {
    await LeaderboardEntry.bulkWrite(leaderboardDocs, { ordered: false });
  }
}

async function getLeaderboard(req, res) {
  try {
    const scope = String(req.query.scope || 'global');
    const period = String(req.query.period || 'all');
    const quizId = req.query.quizId || null;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const batchKey = String(req.query.batchKey || '').trim();
    const cacheKey = `lb:${scope}:${period}:${quizId || 'none'}:${batchKey || 'none'}:${limit}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      } catch (_) {}
    }

    // Rebuild on-demand to ensure fresh stats
    await rebuildScopeLeaderboard({ scope, scopeRef: batchKey || null, quizId, period });

    const find = { scope, period };
    if (quizId) find.quizId = quizId;
    if (scope === 'batch') find.scopeRef = batchKey || null;

    const entries = await LeaderboardEntry.find(find)
      .sort({ compositeScore: -1 })
      .limit(limit)
      .populate('userId', 'name username profile college');

    const userIds = entries.map(e => e.userId?._id).filter(Boolean);
    const badgesByUser = {};
    if (userIds.length > 0) {
      const badgeDocs = await UserBadge.find({ userId: { $in: userIds } }).populate('badgeId', 'name icon');
      for (const b of badgeDocs) {
        const uid = String(b.userId);
        if (!badgesByUser[uid]) badgesByUser[uid] = [];
        badgesByUser[uid].push({ id: b.badgeId?._id, name: b.badgeId?.name, icon_url: b.badgeId?.icon || '' });
      }
    }

    const sparkByUser = {};
    if (userIds.length > 0) {
      const sparkDocs = await Result.aggregate([
        { $match: { userId: { $in: userIds }, status: 'completed' } },
        { $sort: { completedAt: -1 } },
        { $project: { userId: 1, score: 1, totalQuestions: 1 } },
      ]);
      for (const s of sparkDocs) {
        const uid = String(s.userId);
        const pct = (Number(s.totalQuestions) || 0) > 0 ? (Number(s.score) / Number(s.totalQuestions)) * 100 : 0;
        if (!sparkByUser[uid]) sparkByUser[uid] = [];
        if (sparkByUser[uid].length < 12) sparkByUser[uid].push(Number(pct.toFixed(0)));
      }
    }

    const payload = {
      success: true,
      scope,
      period,
      leaderboard: entries.map((e, idx) => ({
        rank: idx + 1,
        user_id: e.userId?._id,
        display_name: e.userId?.name,
        avatar_url: (e.userId?.profile && e.userId.profile.avatar) || '',
        college: e.userId?.college || '',
        composite_score: e.compositeScore,
        avg_score: e.avgScore,
        attempts: e.attempts,
        badges: badgesByUser[String(e.userId?._id)] || [],
        sparkline: sparkByUser[String(e.userId?._id)] || []
      }))
    };

    if (redis) {
      try { await redis.set(cacheKey, JSON.stringify(payload), 'EX', 60); } catch (_) {}
    }

    res.json(payload);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to get leaderboard' });
  }
}

module.exports = { getLeaderboard, rebuildScopeLeaderboard };

