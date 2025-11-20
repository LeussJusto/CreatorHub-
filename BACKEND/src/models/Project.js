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
  platforms: [{ type: String, enum: ['twitch','youtube','instagram'] }],
  status: { type: String, enum: ['not_started','in_progress','completed'], default: 'not_started' },
  dueDate: { type: Date },
  members: [ProjectMemberSchema],
  invitations: [InvitationSchema],
}, { timestamps: true });

ProjectSchema.methods.isMember = function (userId) {
  const uid = String(userId);
  return this.members.some(m => {
    // m.user can be an ObjectId or a populated User document
    const candidate = m.user && m.user._id ? String(m.user._id) : String(m.user);
    return candidate === uid;
  });
};

ProjectSchema.methods.isLeader = function (userId) {
  const uid = String(userId);
  return this.members.some(m => {
    const candidate = m.user && m.user._id ? String(m.user._id) : String(m.user);
    return candidate === uid && m.isLeader;
  });
};

module.exports = mongoose.model('Project', ProjectSchema);
