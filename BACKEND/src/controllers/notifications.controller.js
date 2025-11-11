const Notification = require('../models/Notification');

exports.listMyNotifications = async (req, res) => {
  try {
    const items = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: 'Failed to list notifications' });
  }
};

exports.markRead = async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await Notification.findOneAndUpdate({ _id: id, user: req.user.id }, { read: true }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Failed to mark read' });
  }
};
