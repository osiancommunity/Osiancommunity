const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Badge', badgeSchema);

