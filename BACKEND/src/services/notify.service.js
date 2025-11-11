const Notification = require('../models/Notification');
const { emitToProject, emitToUser } = require('../utils/realtime');

async function notifyProject(projectId, type, data) {
  const notification = await Notification.create({ project: projectId, type, data });
  emitToProject(projectId, 'notification', notification);
  return notification;
}

async function notifyUser(userId, type, data) {
  const notification = await Notification.create({ user: userId, type, data });
  emitToUser(userId, 'notification', notification);
  return notification;
}

module.exports = { notifyProject, notifyUser };
