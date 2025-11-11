const { validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { notifyProject } = require('../services/notify.service');

exports.createTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { projectId, title, description, assignees, dueDate } = req.body;
  try {
    const project = await Project.findById(projectId);
    if (!project || !project.isMember(req.user.id)) return res.status(403).json({ error: 'Not allowed' });
    const task = await Task.create({ project: projectId, title, description, assignees, dueDate, createdBy: req.user.id });
    await notifyProject(projectId, 'task:created', { taskId: task._id, title: task.title });
    res.status(201).json(task);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create task' });
  }
};

exports.listTasks = async (req, res) => {
  const { projectId } = req.params;
  try {
    const tasks = await Task.find({ project: projectId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

exports.updateTask = async (req, res) => {
  const { taskId } = req.params;
  try {
    const task = await Task.findByIdAndUpdate(taskId, req.body, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await notifyProject(task.project.toString(), 'task:updated', { taskId: task._id });
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update task' });
  }
};

exports.deleteTask = async (req, res) => {
  const { taskId } = req.params;
  try {
    const task = await Task.findByIdAndDelete(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await notifyProject(task.project.toString(), 'task:deleted', { taskId });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

exports.toggleChecklist = async (req, res) => {
  const { taskId } = req.params;
  const { index, completed } = req.body;
  try {
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const item = task.checklist[index];
    if (!item) return res.status(400).json({ error: 'Checklist item not found' });
    item.completed = !!completed;
    item.completedAt = completed ? new Date() : null;
    await task.save();
    await notifyProject(task.project.toString(), 'task:checklist', { taskId, index, completed });
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: 'Failed to toggle checklist' });
  }
};
