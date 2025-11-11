const mongoose = require('mongoose');

const ScriptVersionSchema = new mongoose.Schema({
  content: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

const CommentSchema = new mongoose.Schema({
  sectionId: { type: String, required: true },
  text: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

const ScriptSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  title: { type: String, required: true },
  status: { type: String, enum: ['draft', 'in_review', 'approved'], default: 'draft' },
  versions: [ScriptVersionSchema],
  comments: [CommentSchema],
  currentVersionIndex: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Script', ScriptSchema);
