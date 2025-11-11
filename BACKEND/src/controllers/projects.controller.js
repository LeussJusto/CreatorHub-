const crypto = require('crypto');
const { validationResult } = require('express-validator');
const Project = require('../models/Project');
const { emitToProject } = require('../utils/realtime');

exports.createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, description } = req.body;
  try {
    const project = await Project.create({
      name,
      description,
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

exports.getProjectById = async (req, res) => {
  const { projectId } = req.params;
  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.isMember(req.user.id)) return res.status(403).json({ error: 'Not allowed' });
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
