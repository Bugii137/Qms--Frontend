const Joi = require('joi');
const adminService = require('../services/adminService');

const statusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

const createUserSchema = Joi.object({
  fullName: Joi.string().min(2).max(150).required(),
  email: Joi.string().email().max(150).required(),
  phone: Joi.string().max(30).allow('', null),
  password: Joi.string().min(8).required(),
});

const updateUserSchema = Joi.object({
  fullName: Joi.string().min(2).max(150),
  email: Joi.string().email().max(150),
  phone: Joi.string().max(30).allow('', null),
}).min(1);

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

async function createUser(req, res, next) {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const user = await adminService.createUser(value);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const user = await adminService.updateUser(req.params.id, value);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = await adminService.setUserActive(req.user.id, req.params.id, false);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, createUser, updateUser, setUserActive, deleteUser };
