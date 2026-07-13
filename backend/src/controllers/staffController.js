const Joi = require('joi');
const staffService = require('../services/staffService');

const ACCESS_LEVELS = ['view_only', 'manage_appointments', 'full_access'];
const JOB_TITLES = ['Receptionist', 'Doctor', 'Nurse', 'Lab Technician', 'Administrator'];

const inviteSchema = Joi.object({
  fullName: Joi.string().min(2).max(150).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(30).allow('', null),
  jobTitle: Joi.string().valid(...JOB_TITLES).default('Receptionist'),
  accessLevel: Joi.string().valid(...ACCESS_LEVELS).default('view_only'),
});

const updateSchema = Joi.object({
  jobTitle: Joi.string().valid(...JOB_TITLES),
  accessLevel: Joi.string().valid(...ACCESS_LEVELS),
}).min(1);

const statusSchema = Joi.object({
  status: Joi.string().valid('invited', 'active', 'inactive').required(),
});

async function listByOwner(req, res, next) {
  try {
    const staff = await staffService.listByOwner(req.user.id);
    res.json({ staff });
  } catch (err) {
    next(err);
  }
}

async function invite(req, res, next) {
  try {
    const { error, value } = inviteSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const staffMember = await staffService.invite(req.user.id, value);
    res.status(201).json({ staff: staffMember });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { error, value } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const staffMember = await staffService.update(req.user.id, req.params.id, value);
    res.json({ staff: staffMember });
  } catch (err) {
    next(err);
  }
}

async function setStatus(req, res, next) {
  try {
    const { error, value } = statusSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const staffMember = await staffService.setStatus(req.user.id, req.params.id, value.status);
    res.json({ staff: staffMember });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await staffService.remove(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getMine(req, res, next) {
  try {
    const assignment = await staffService.getMine(req.user.id);
    res.json({ assignment });
  } catch (err) {
    next(err);
  }
}

module.exports = { listByOwner, invite, update, setStatus, remove, getMine };
