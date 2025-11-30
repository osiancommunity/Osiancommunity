const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from parent directory
dotenv.config({ path: '../.env' });

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
app.use((req, res, next) => { console.log('Incoming', req.method, req.url); next(); });
app.use(express.json({ limit: '50mb' })); // Increase payload limit for large quiz data
app.use(express.urlencoded({ limit: '50mb', extended: true })); // For form data

// --- ADD THIS TO SERVE THE FRONTEND ---
// Serve static files from the parent directory (where index.html is)
app.use(express.static(path.join(__dirname, '..')));

// Connect to MongoDB with fallback to in-memory server for development
async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/osian';
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB:', uri);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

connectDatabase();

// Routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const resultRoutes = require('./routes/resultRoutes');
const mentorshipRoutes = require('./routes/mentorshipRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/mentorship', mentorshipRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Osian Backend is running' });
});

// List routes for diagnostics
app.get('/api/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((m) => {
    if (m.route && m.route.path) {
      const methods = Object.keys(m.route.methods).join(',');
      routes.push({ path: m.route.path, methods });
    } else if (m.name === 'router' && m.handle && m.handle.stack) {
      m.handle.stack.forEach((s) => {
        const route = s.route;
        if (route) {
          const methods = Object.keys(route.methods).join(',');
          routes.push({ path: route.path, methods });
        }
      });
    }
  });
  res.json({ routes });
});

// --- Frontend routing (only for non-API GET requests) ---
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, '..', 'index.html'));
  }
  next();
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
