const crypto = require('crypto');
const { validationResult } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');
const { emitToProject } = require('../utils/realtime');
const { notifyUser } = require('../services/notify.service');

exports.createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, description, platforms, status, dueDate } = req.body;
  try {
    const project = await Project.create({
      name,
      description,
      platforms: platforms || [],
      status: status || 'not_started',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      members: [{ user: req.user.id, isLeader: true }],
    });
    emitToProject(project._id.toString(), 'project:updated', project);
    res.status(201).json(project);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create project' });
  }
};

exports.getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.user.id });
    // Auto-mark projects completed if dueDate passed
    const now = new Date();
    const updates = projects.map(async p => {
      try {
        if (p.dueDate && p.status !== 'completed' && new Date(p.dueDate) < now) {
          p.status = 'completed';
          await p.save();
        }
      } catch (err) {
        console.error('Failed to auto-update project status for', p._id, err);
      }
    });
    await Promise.all(updates);
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

exports.inviteMember = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { projectId } = req.params;
  const { email } = req.body;
  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.isLeader(req.user.id)) return res.status(403).json({ error: 'Only leaders can invite' });
    const token = crypto.randomBytes(24).toString('hex');
    project.invitations.push({ email, token, invitedBy: req.user.id, expiresAt: new Date(Date.now() + 1000*60*60*24*7) });
    await project.save();
    emitToProject(project._id.toString(), 'project:updated', project);

    // If the user already exists in the system, create a user-targeted notification
    try {
      const invitedUser = await User.findOne({ email: email.toLowerCase() });
      if (invitedUser) {
        await notifyUser(invitedUser._id, 'project_invite', { projectId: project._id.toString(), projectName: project.name, token, invitedBy: req.user.id });
      }
    } catch (notifyErr) {
      console.error('Failed to notify invited user', notifyErr);
    }

    // Return the token (in dev this helps testing). In production you should send an email instead.
    res.status(201).json({ token });
  } catch (e) {
    res.status(500).json({ error: 'Failed to invite member' });
  }
};

exports.acceptInvitation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { projectId } = req.params;
  const { token } = req.body;
  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const invite = project.invitations.find(i => i.token === token && i.status === 'pending');
    if (!invite) return res.status(400).json({ error: 'Invalid invitation' });
    if (invite.expiresAt && invite.expiresAt < new Date()) return res.status(400).json({ error: 'Invitation expired' });

    if (!project.isMember(req.user.id)) {
      project.members.push({ user: req.user.id, isLeader: false });
    }

    invite.status = 'accepted';
    await project.save();
    emitToProject(project._id.toString(), 'project:updated', project);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
};

exports.setLeader = async (req, res) => {
  const { projectId } = req.params;
  const { memberId, isLeader } = req.body;
  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.isLeader(req.user.id)) return res.status(403).json({ error: 'Only leaders can assign roles' });
    const member = project.members.find(m => m.user.toString() === memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    member.isLeader = !!isLeader;
    await project.save();
    emitToProject(project._id.toString(), 'project:updated', project);
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update leader role' });
  }
};

exports.removeMember = async (req, res) => {
  const { projectId, memberId } = req.params;
  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.isLeader(req.user.id)) return res.status(403).json({ error: 'Only leaders can remove members' });
    const idx = project.members.findIndex(m => String((m.user && m.user._id) ? m.user._id : m.user) === String(memberId));
    if (idx === -1) return res.status(404).json({ error: 'Member not found' });
    // Prevent removing the only leader
    const member = project.members[idx];
    if (member.isLeader) {
      const otherLeader = project.members.find(m => m.isLeader && String((m.user && m.user._id) ? m.user._id : m.user) !== String(memberId));
      if (!otherLeader) return res.status(400).json({ error: 'Cannot remove the only leader' });
    }
    project.members.splice(idx, 1);
    await project.save();
    emitToProject(project._id.toString(), 'project:updated', project);
    res.json({ ok: true });
  } catch (e) {
    console.error('removeMember error', e);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

exports.getProjectById = async (req, res) => {
  const { projectId } = req.params;
  try {
    const project = await Project.findById(projectId).populate('members.user', 'name email');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    // DEBUG: log user id and members to help diagnose 403 (access denied)
    try {
      console.log('DEBUG getProjectById - req.user.id:', req.user && req.user.id);
      console.log('DEBUG getProjectById - project.members:', project.members.map(m => {
        const userVal = m.user && m.user._id ? m.user._id : m.user;
        return { user: String(userVal), userType: typeof userVal, isLeader: m.isLeader };
      }));
    } catch (logErr) {
      console.log('DEBUG getProjectById - failed to log members', logErr);
    }
    if (!project.isMember(req.user.id)) return res.status(403).json({ error: 'Not allowed' });

    // Auto-mark project completed if dueDate passed
    try {
      const now = new Date();
      if (project.dueDate && project.status !== 'completed' && new Date(project.dueDate) < now) {
        project.status = 'completed';
        await project.save();
      }
    } catch (err) {
      console.error('Failed to auto-update project status for', project._id, err);
    }

    res.json(project);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

exports.updateProject = async (req, res) => {
  const { projectId } = req.params;
  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.isLeader(req.user.id)) return res.status(403).json({ error: 'Only leaders can update' });
    project.name = req.body.name ?? project.name;
    project.description = req.body.description ?? project.description;
    // allow updating dueDate
    if (req.body.dueDate !== undefined) {
      const newDue = req.body.dueDate ? new Date(req.body.dueDate) : undefined;
      project.dueDate = newDue;
      try {
        const now = new Date();
        if (newDue && newDue < now) {
          project.status = 'completed';
        } else if (project.status === 'completed' && newDue && newDue >= now) {
          // if project was completed but dueDate moved to future, reopen as in_progress
          project.status = 'in_progress';
        }
      } catch (err) {
        console.error('Failed to evaluate project dueDate logic', err);
      }
    }
    await project.save();
    emitToProject(project._id.toString(), 'project:updated', project);
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update project' });
  }
};

exports.deleteProject = async (req, res) => {
  const { projectId } = req.params;
  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.isLeader(req.user.id)) return res.status(403).json({ error: 'Only leaders can delete' });
    await project.deleteOne();
    emitToProject(projectId, 'project:deleted', { id: projectId });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
