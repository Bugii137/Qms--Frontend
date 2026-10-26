const notificationService = require('../services/notificationService');

async function listMine(req, res, next) {
  try {
    const unreadOnly = req.query.unread === 'true';
    const notifications = await notificationService.listForUser(req.user.id, { unreadOnly });
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const notification = await notificationService.markRead(req.user.id, req.params.id);
    res.json({ notification });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await notificationService.markAllRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await notificationService.remove(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listMine, markRead, markAllRead, remove };
