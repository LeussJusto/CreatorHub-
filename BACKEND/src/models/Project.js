const mongoose = require('mongoose');

const InvitationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  token: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'expired'], default: 'pending' },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invitedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
});

const ProjectMemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isLeader: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
});

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  members: [ProjectMemberSchema],
  invitations: [InvitationSchema],
}, { timestamps: true });

ProjectSchema.methods.isMember = function (userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

ProjectSchema.methods.isLeader = function (userId) {
  return this.members.some(m => m.user.toString() === userId.toString() && m.isLeader);
};

module.exports = mongoose.model('Project', ProjectSchema);
