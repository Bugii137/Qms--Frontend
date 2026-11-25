const analyticsService = require('../services/analyticsService');
const Joi = require('joi');

const reportPeriodSchema = Joi.object({
  from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  institutionId: Joi.number().integer().positive(),
  category: Joi.string().max(80),
  appointmentStatus: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled', 'completed'),
  userRole: Joi.string().valid('client', 'institution_admin', 'staff', 'admin'),
  institutionStatus: Joi.string().valid('pending', 'active', 'suspended'),
}).custom((value, helpers) => {
  const { from, to } = value;
  const validDate = (value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  if (!validDate(from) || !validDate(to)) return helpers.error('any.invalid');
  if (from > to) return helpers.error('date.order');
  return value;
}).messages({
  'any.invalid': 'from and to must be valid calendar dates in YYYY-MM-DD format',
  'date.order': 'from must be on or before to',
});

async function getSummary(req, res, next) {
  try {
    const summary = await analyticsService.getPlatformSummary();
    res.json({ summary });
  } catch (err) {
    next(err);
  }
}

async function getAnalytics(req, res, next) {
  try {
    const analytics = await analyticsService.getPlatformAnalytics();
    res.json({ analytics });
  } catch (err) {
    next(err);
  }
}

async function getReport(req, res, next) {
  try {
    const { error, value } = reportPeriodSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const report = await analyticsService.getPlatformReport(value);
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary, getAnalytics, getReport };
