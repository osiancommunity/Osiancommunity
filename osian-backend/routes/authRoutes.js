const express = require('express');
const router = express.Router();
const { register, verifyOtp, resendOtp, login, changePassword, forgotPassword, resetPassword } = require('../controllers/authController');
const { authenticateToken: protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/change-password', protect, changePassword);

module.exports = router;
