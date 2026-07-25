const Joi = require('joi');
const settingsService = require('../services/settingsService');

const updateSchema = Joi.object({
  platformName: Joi.string().min(1).max(100),
  supportEmail: Joi.string().email(),
  maintenanceMode: Joi.boolean(),
  maintenanceMessage: Joi.string().min(1).max(500),
}).min(1);

async function getSettings(req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const { error, value } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const settings = await settingsService.updateSettings(value);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings };
