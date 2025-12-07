const mongoose = require('mongoose');

const leaderboardEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scope: { type: String, enum: ['global','batch','quiz'], required: true },
  scopeRef: { type: String },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  period: { type: String, enum: ['all','30d','7d'], default: 'all' },
  avgScore: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  compositeScore: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

leaderboardEntrySchema.index({ scope: 1, period: 1, compositeScore: -1 });
leaderboardEntrySchema.index({ quizId: 1, period: 1, compositeScore: -1 });
leaderboardEntrySchema.index({ scope: 1, scopeRef: 1, period: 1, compositeScore: -1 });
leaderboardEntrySchema.index({ userId: 1, scope: 1, scopeRef: 1, quizId: 1, period: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('LeaderboardEntry', leaderboardEntrySchema);

