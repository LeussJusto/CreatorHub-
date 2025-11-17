const mongoose = require('mongoose');

const ChecklistItemSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
});

const TaskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dueDate: { type: Date },
  checklist: [ChecklistItemSchema],
  // Keep old values for backward compatibility and accept new frontend values
  status: { type: String, enum: ['todo','pending', 'in_progress', 'done','completed'], default: 'pending' },
  category: { type: String, enum: ['bajo','medio','alto'], default: 'medio' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
