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
let connected = false;
async function connectDatabase() {
  if (connected) return;
  const isServerless = !!process.env.VERCEL;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    if (isServerless) {
      throw new Error('MONGODB_URI is not set in environment');
    } else {
      const local = 'mongodb://localhost:27017/osian';
      await mongoose.connect(local);
      console.log('Connected to local MongoDB:', local);
      connected = true;
      return;
    }
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB:', uri);
  connected = true;
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
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
