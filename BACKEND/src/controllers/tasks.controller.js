const { validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { notifyProject } = require('../services/notify.service');

exports.createTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { projectId, title, description, assignees, dueDate, category } = req.body;
  try {
    const project = await Project.findById(projectId);
    // Only project leader can create tasks
    if (!project || !project.isLeader(req.user.id)) return res.status(403).json({ error: 'Not allowed' });
    const createPayload = { project: projectId, title, description, assignees, dueDate, createdBy: req.user.id };
    if (category) createPayload.category = category;
    const task = await Task.create(createPayload);
    await notifyProject(projectId, 'task:created', { taskId: task._id, title: task.title });
    res.status(201).json(task);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create task' });
  }
};

exports.listTasks = async (req, res) => {
  const { projectId } = req.params;
  try {
    // Return tasks ordered by dueDate (assigned date). Tasks without dueDate are placed last.
    const tasks = await Task.find({ project: projectId });
    tasks.sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (ad === bd) return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return ad - bd;
    });
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

exports.updateTask = async (req, res) => {
  const { taskId } = req.params;
  try {
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    // Allow update if user is project leader OR the task creator
    const isLeader = project.isLeader(req.user.id);
    const isCreator = String(task.createdBy) === String(req.user.id);
    if (!isLeader && !isCreator) return res.status(403).json({ error: 'Not allowed' });
    // Only allow specific fields to be updated
    const allowed = ['status','title','description','assignees','dueDate','category'];
    allowed.forEach(k => {
      if (typeof req.body[k] !== 'undefined') task[k] = req.body[k];
    });
    await task.save();
    await notifyProject(task.project.toString(), 'task:updated', { taskId: task._id });
    res.json(task);
  } catch (e) {
    console.error('updateTask error', e);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

exports.deleteTask = async (req, res) => {
  const { taskId } = req.params;
  try {
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    // only project leader (creator) can delete tasks
    if (!project.isLeader(req.user.id)) return res.status(403).json({ error: 'Not allowed' });
    await Task.findByIdAndDelete(taskId);
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
