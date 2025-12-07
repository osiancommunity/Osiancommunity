const mongoose = require('mongoose');

const userBadgeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  badgeCode: { type: String, required: true },
  earnedAt: { type: Date, default: Date.now },
  meta: { type: Object }
});

userBadgeSchema.index({ userId: 1, badgeCode: 1 }, { unique: true });

module.exports = mongoose.model('UserBadge', userBadgeSchema);

