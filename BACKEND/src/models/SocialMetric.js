const mongoose = require('mongoose');

const SocialMetricSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  platform: { type: String, enum: ['instagram', 'tiktok', 'youtube'], required: true },
  accountId: { type: String },
  metrics: { type: Object, default: {} },
  capturedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

module.exports = mongoose.model('SocialMetric', SocialMetricSchema);
