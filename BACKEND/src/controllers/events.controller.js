const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const Project = require('../models/Project');
const { notifyProject } = require('../services/notify.service');

exports.createEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { projectId, title, description, start, end, allDay } = req.body;
  try {
    const project = await Project.findById(projectId);
    if (!project || !project.isMember(req.user.id)) return res.status(403).json({ error: 'Not allowed' });
    const event = await Event.create({ project: projectId, title, description, start, end, allDay, createdBy: req.user.id });
    await notifyProject(projectId, 'event:created', { eventId: event._id, title });
    res.status(201).json(event);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create event' });
  }
};

exports.listEvents = async (req, res) => {
  const { projectId } = req.params;
  const { from, to } = req.query;
  try {
    const query = { project: projectId };
    if (from || to) {
      query.start = {};
      if (from) query.start.$gte = new Date(from);
      if (to) query.start.$lte = new Date(to);
    }
    const events = await Event.find(query).sort({ start: 1 });
    res.json(events);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

exports.updateEvent = async (req, res) => {
  const { eventId } = req.params;
  try {
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const project = await Project.findById(event.project);
    if (!project || !project.isMember(req.user.id)) return res.status(403).json({ error: 'Not allowed' });
    Object.assign(event, req.body);
    await event.save();
    await notifyProject(event.project.toString(), 'event:updated', { eventId });
    res.json(event);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update event' });
  }
};

exports.deleteEvent = async (req, res) => {
  const { eventId } = req.params;
  try {
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const project = await Project.findById(event.project);
    if (!project || !project.isMember(req.user.id)) return res.status(403).json({ error: 'Not allowed' });
    await event.deleteOne();
    await notifyProject(event.project.toString(), 'event:deleted', { eventId });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
};
