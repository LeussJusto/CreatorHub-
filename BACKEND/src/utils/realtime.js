let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function emitToProject(projectId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`project:${projectId}`).emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}

module.exports = { setIO, emitToProject, emitToUser };
