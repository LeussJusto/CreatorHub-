const mongoose = require('mongoose');

const IntegrationAccountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  platform: { type: String, enum: ['instagram', 'tiktok', 'youtube'], required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  metadata: { type: Object, default: {} },
  expiresAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('IntegrationAccount', IntegrationAccountSchema);
