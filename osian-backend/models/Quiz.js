const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Question sub-schema
const questionSchema = new Schema(
  {
    questionText: { type: String, required: true },
    questionType: { type: String, enum: ['mcq', 'written', 'coding'], required: true },
    questionImage: { type: String },
    explanation: { type: String },
    marks: { type: Number, default: 1 },
    // MCQ-specific
    isMultiple: { type: Boolean, default: false },
    options: [{
      text: { type: String },
      image: { type: String }
    }],
    correctAnswer: { type: Number },
    correctAnswers: [{ type: Number }],
    // Coding-specific
    codeLanguage: { type: String },
    codeStarter: { type: String }
  },
  { _id: false }
);

// This is the main schema for the quiz
const quizSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: { type: String },
    category: {
        type: String,
        required: true
    },
    field: { type: String },
    difficulty: { type: String, enum: ['basic', 'medium', 'hard'] },
    quizType: {
        type: String,
        enum: ['regular', 'live', 'upcoming', 'paid'],
        required: true
    },
    duration: {
        type: Number, // Stored in minutes
        required: true
    },
    
    // Cover image stored as a Base64 string
    coverImage: {
        type: String
    },

    registrationLimit: {
        type: Number,
        default: 0
    },
    scheduleTime: {
        type: Date,
        required: false
    },
    price: {
        type: Number,
        default: 0
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'unlisted'],
        default: 'public'
    },
    questions: [questionSchema], // An array of the new question schema
    numQuestionsToShow: { type: Number },
    
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'upcoming', 'draft', 'completed'],
        default: 'draft'
    },
    registeredUsers: {
        type: Number,
        default: 0
    },
    participants: [{
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date
        },
        completedAt: {
            type: Date
        },
        score: {
            type: Number
        }
    }],
    maxParticipants: {
        type: Number,
        default: null
    }
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;
