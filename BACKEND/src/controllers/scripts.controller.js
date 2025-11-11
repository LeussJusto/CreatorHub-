const { validationResult } = require('express-validator');
const Script = require('../models/Script');
const Project = require('../models/Project');
const { notifyProject } = require('../services/notify.service');

exports.createScript = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { projectId, title, content } = req.body;
  try {
    const project = await Project.findById(projectId);
    if (!project || !project.isMember(req.user.id)) return res.status(403).json({ error: 'Not allowed' });
    const script = await Script.create({
      project: projectId,
      title,
      versions: [{ content, createdBy: req.user.id }],
      currentVersionIndex: 0,
    });
    await notifyProject(projectId, 'script:created', { scriptId: script._id, title });
    res.status(201).json(script);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create script' });
  }
};

exports.addVersion = async (req, res) => {
  const { scriptId } = req.params;
  const { content } = req.body;
  try {
    const script = await Script.findById(scriptId);
    if (!script) return res.status(404).json({ error: 'Script not found' });
    const project = await Project.findById(script.project);
    if (!project || !project.isMember(req.user.id)) return res.status(403).json({ error: 'Not allowed' });
    script.versions.push({ content, createdBy: req.user.id });
    script.currentVersionIndex = script.versions.length - 1;
    script.status = 'in_review';
    await script.save();
    await notifyProject(script.project.toString(), 'script:version', { scriptId, version: script.currentVersionIndex });
    res.json(script);
  } catch (e) {
    res.status(500).json({ error: 'Failed to add version' });
  }
};

exports.comment = async (req, res) => {
  const { scriptId } = req.params;
  const { sectionId, text } = req.body;
  try {
    const script = await Script.findById(scriptId);
    if (!script) return res.status(404).json({ error: 'Script not found' });
    const project = await Project.findById(script.project);
    if (!project || !project.isMember(req.user.id)) return res.status(403).json({ error: 'Not allowed' });
    script.comments.push({ sectionId, text, createdBy: req.user.id });
    await script.save();
    await notifyProject(script.project.toString(), 'script:comment', { scriptId, sectionId });
    res.json(script);
  } catch (e) {
    res.status(500).json({ error: 'Failed to comment' });
  }
};

exports.setStatus = async (req, res) => {
  const { scriptId } = req.params;
  const { status } = req.body;
  try {
    const script = await Script.findById(scriptId);
    if (!script) return res.status(404).json({ error: 'Script not found' });
    const project = await Project.findById(script.project);
    if (!project || !project.isMember(req.user.id)) return res.status(403).json({ error: 'Not allowed' });
    if (status === 'approved' && !project.isLeader(req.user.id)) {
      return res.status(403).json({ error: 'Only leaders can approve' });
    }
    script.status = status;
    await script.save();
    await notifyProject(script.project.toString(), 'script:status', { scriptId, status });
    res.json(script);
  } catch (e) {
    res.status(500).json({ error: 'Failed to set status' });
  }
};
