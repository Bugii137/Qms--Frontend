const notificationService = require('../services/notificationService');
const Joi = require('joi');

const preferencesSchema = Joi.object(
  Object.fromEntries(
    Object.keys(notificationService.PREFERENCE_DEFAULTS).map(key => [key, Joi.boolean()])
  )
).min(1);

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

async function getPreferences(req, res, next) {
  try {
    const preferences = await notificationService.getPreferences(req.user.id);
    res.json({ preferences });
  } catch (err) {
    next(err);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const { error, value } = preferencesSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const preferences = await notificationService.updatePreferences(req.user.id, value);
    res.json({ preferences });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMine, markRead, markAllRead, remove, getPreferences, updatePreferences };
