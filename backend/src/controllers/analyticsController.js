const analyticsService = require('../services/analyticsService');

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

module.exports = { getSummary, getAnalytics };
