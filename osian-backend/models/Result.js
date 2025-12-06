const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'pending'],
    default: 'in-progress'
  },
  cheatingViolation: {
    type: String
  },
  violationCount: {
    type: Number,
    default: 0
  },
  releaseTime: {
    type: Date
  },
  passed: {
    type: Boolean,
    default: false
  },
  answers: [{
    questionIndex: {
      type: Number,
      required: true
    },
    selectedAnswer: {
      type: Number
    },
    selectedAnswers: [{ type: Number }],
    writtenAnswer: {
      type: String
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    correctIndices: [{ type: Number }],
    explanation: { type: String },
    timeSpent: {
      type: Number,
      default: 0
    }
  }],
  timeTaken: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

// Index for efficient queries
resultSchema.index({ userId: 1, quizId: 1 });
resultSchema.index({ status: 1 });

module.exports = mongoose.model('Result', resultSchema);
