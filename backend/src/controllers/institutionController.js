const Joi = require('joi');
const institutionService = require('../services/institutionService');

const createSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  category: Joi.string().max(80).allow('', null),
  description: Joi.string().max(1000).allow('', null),
  address: Joi.string().max(255).allow('', null),
  phone: Joi.string().max(30).allow('', null),
  email: Joi.string().email().allow('', null),
  logoUrl: Joi.string().uri().allow('', null),
});

const updateSchema = Joi.object({
  name: Joi.string().min(2).max(150),
  category: Joi.string().max(80).allow('', null),
  description: Joi.string().max(1000).allow('', null),
  address: Joi.string().max(255).allow('', null),
  phone: Joi.string().max(30).allow('', null),
  email: Joi.string().email().allow('', null),
  logoUrl: Joi.string().uri().allow('', null),
}).min(1);

const statusSchema = Joi.object({
  status: Joi.string().valid('pending', 'active', 'suspended').required(),
});

const adminCreateSchema = createSchema.keys({
  ownerId: Joi.number().integer().positive().required(),
});

// ── Public ───────────────────────────────────────────────────────────────────
async function listPublic(req, res, next) {
  try {
    const { search, category } = req.query;
    const institutions = await institutionService.listPublic({ search, category });
    res.json({ institutions });
  } catch (err) {
    next(err);
  }
}

async function getPublicById(req, res, next) {
  try {
    const institution = await institutionService.getPublicById(req.params.id);
    res.json({ institution });
  } catch (err) {
    next(err);
  }
}

// ── Institution admin (self-service) ────────────────────────────────────────
async function getMine(req, res, next) {
  try {
    const institution = await institutionService.getByOwner(req.user.id);
    res.json({ institution });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const institution = await institutionService.create(req.user.id, value);
    res.status(201).json({ institution });
  } catch (err) {
    next(err);
  }
}

async function updateMine(req, res, next) {
  try {
    const { error, value } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const institution = await institutionService.updateByOwner(req.user.id, value);
    res.json({ institution });
  } catch (err) {
    next(err);
  }
}

// ── System admin ─────────────────────────────────────────────────────────────
async function listForSystemAdmin(req, res, next) {
  try {
    const { status } = req.query;
    const institutions = await institutionService.listForSystemAdmin({ status });
    res.json({ institutions });
  } catch (err) {
    next(err);
  }
}

async function setStatus(req, res, next) {
  try {
    const { error, value } = statusSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await institutionService.setStatus(req.params.id, value.status);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createForSystemAdmin(req, res, next) {
  try {
    const { error, value } = adminCreateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const institution = await institutionService.createForSystemAdmin(value);
    res.status(201).json({ institution });
  } catch (err) {
    next(err);
  }
}

async function updateForSystemAdmin(req, res, next) {
  try {
    const { error, value } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const institution = await institutionService.updateForSystemAdmin(req.params.id, value);
    res.json({ institution });
  } catch (err) {
    next(err);
  }
}

async function deleteForSystemAdmin(req, res, next) {
  try {
    const { institution } = await institutionService.setStatus(req.params.id, 'suspended');
    res.json({ institution });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPublic,
  getPublicById,
  getMine,
  create,
  updateMine,
  listForSystemAdmin,
  createForSystemAdmin,
  updateForSystemAdmin,
  deleteForSystemAdmin,
  setStatus,
};
