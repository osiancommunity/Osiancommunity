const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables (Vercel injects envs automatically)
dotenv.config();

const app = express();

// --- THIS IS THE FIX ---
// Allow all origins for development - more permissive CORS
app.use(cors({
  origin: true, // Allow all origins
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// -----------------------

// Middleware
app.use(express.json({ limit: '50mb' })); // Increase payload limit for large quiz data
app.use(express.urlencoded({ limit: '50mb', extended: true })); // For form data

// Backend-only deploy: do not serve static files

// Connect to MongoDB (require real URI on Vercel; optional local fallback)
async function connectDatabase() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return;
  }
  const isServerless = !!process.env.VERCEL;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    if (isServerless) {
      throw new Error('MONGODB_URI is not set in environment');
    } else {
      const local = 'mongodb://localhost:27017/osian';
      await mongoose.connect(local, {
        serverSelectionTimeoutMS: 30000,
        retryWrites: true
      });
      console.log('Connected to local MongoDB:', local);
      return;
    }
  }
  const connectOpts = {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    retryWrites: true
  };
  if (process.env.MONGODB_DBNAME) {
    connectOpts.dbName = process.env.MONGODB_DBNAME;
  }
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await mongoose.connect(uri, connectOpts);
      try {
        const safeUri = String(uri).replace(/\/\/.*@/, '//***@');
        console.log('Connected to MongoDB:', safeUri);
      } catch (_) {
        console.log('Connected to MongoDB');
      }
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  throw lastErr;
}

// Ensure DB is connected before handling requests
app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

// Routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const resultRoutes = require('./routes/resultRoutes');
const mentorshipRoutes = require('./routes/mentorshipRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const badgeRoutes = require('./routes/badgeRoutes');

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/mentorship', mentorshipRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/badges', badgeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Osian Backend is running' });
});

app.get('/api/health/db', (req, res) => {
  const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  res.json({ connected: state === 1, state });
});

app.get('/api/debug/env', (req, res) => {
  res.json({
    has_MONGODB_URI: !!process.env.MONGODB_URI,
    has_JWT_SECRET: !!process.env.JWT_SECRET,
    has_EMAIL_HOST: !!process.env.EMAIL_HOST,
    has_EMAIL_USER: !!process.env.EMAIL_USER,
    has_EMAIL_PASS: !!process.env.EMAIL_PASS,
    vercel: !!process.env.VERCEL
  });
});

// Root route for Vercel project landing
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'osian-backend', docs: '/api/health' });
});

// Backend-only: return 404 for non-API routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not Found' });
});

// --- Global Error Handler ---
// This prevents HTML error pages and ensures JSON responses
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  const http = require('http');
  const server = http.createServer(app);

  // WebSocket server for real-time leaderboard
  try {
    const { rebuildScopeLeaderboard } = require('./controllers/leaderboardController');
    const LeaderboardEntry = require('./models/LeaderboardEntry');
    const WebSocket = require('ws');
    const wss = new WebSocket.Server({ server, path: '/ws/leaderboard' });

    wss.on('connection', (ws, req) => {
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
      const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
      const scope = String(params.get('scope') || 'global');
      const period = String(params.get('period') || 'all');
      const quizId = params.get('quizId') || null;
      const batchKey = params.get('batchKey') || '';

      const sendLeaderboard = async () => {
        try {
          await rebuildScopeLeaderboard({ scope, scopeRef: batchKey || null, quizId, period });
          const find = { scope, period };
          if (quizId) find.quizId = quizId;
          if (scope === 'batch') find.scopeRef = batchKey || null;
          const rows = await LeaderboardEntry.find(find).sort({ compositeScore: -1 }).limit(10).populate('userId', 'name username profile college');
          const UserBadge = require('./models/UserBadge');
          const userIds = rows.map(e => e.userId?._id).filter(Boolean);
          const badgesByUser = {};
          if (userIds.length > 0) {
            const badgeDocs = await UserBadge.find({ userId: { $in: userIds } }).populate('badgeId', 'name icon');
            for (const b of badgeDocs) {
              const uid = String(b.userId);
              if (!badgesByUser[uid]) badgesByUser[uid] = [];
              badgesByUser[uid].push({ id: b.badgeId?._id, name: b.badgeId?.name, icon_url: b.badgeId?.icon || '' });
            }
          }
          const Result = require('./models/Result');
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
          ws.send(JSON.stringify({
            type: 'leaderboard',
            scope,
            period,
            leaderboard: rows.map((e, i) => ({
              rank: i + 1,
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
          }));
        } catch (err) {
          try { ws.send(JSON.stringify({ type: 'error', message: 'Failed to load leaderboard' })); } catch (_) {}
        }
      };

      sendLeaderboard();
      const interval = setInterval(sendLeaderboard, 15000);
      ws.on('close', () => clearInterval(interval));
      ws.on('error', () => clearInterval(interval));
    });

    const interval = setInterval(() => {
      wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
    wss.on('close', () => clearInterval(interval));
  } catch (err) {
    console.warn('WebSocket leaderboard disabled:', err.message);
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WS leaderboard at ws://localhost:${PORT}/ws/leaderboard`);
  });
}

module.exports = app;
