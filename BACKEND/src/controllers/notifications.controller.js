const Notification = require('../models/Notification');

// Get current user's notifications (most recent first)
exports.getMyNotifications = async (req, res) => {
  try {
    const notifs = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100);
    res.json(notifs);
  } catch (e) {
    console.error('getMyNotifications error', e);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark a notification as read (only by its owner)
exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await Notification.findOneAndUpdate({ _id: id, user: req.user.id }, { read: true }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
    res.json(updated);
  } catch (e) {
    console.error('markAsRead error', e);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};
