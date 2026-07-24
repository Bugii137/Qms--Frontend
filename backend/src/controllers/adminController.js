const Joi = require('joi');
const adminService = require('../services/adminService');

const statusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

async function listUsers(req, res, next) {
  try {
    const { search, role } = req.query;
    const isActive = req.query.isActive === undefined ? undefined : req.query.isActive === 'true';
    const users = await adminService.listUsers({ search, role, isActive });
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function setUserActive(req, res, next) {
  try {
    const { error, value } = statusSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = await adminService.setUserActive(req.user.id, req.params.id, value.isActive);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, setUserActive };
