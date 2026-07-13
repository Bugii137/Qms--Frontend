const Joi = require('joi');
const appointmentService = require('../services/appointmentService');

const bookSchema = Joi.object({
  institutionId: Joi.number().integer().required(),
  serviceId: Joi.number().integer().required(),
  appointmentDate: Joi.date().iso().required(),
  appointmentTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required()
    .messages({ 'string.pattern.base': 'appointmentTime must be in HH:mm 24-hour format' }),
  notes: Joi.string().max(500).allow('', null),
});

const statusSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled', 'completed').required(),
});

const assignSchema = Joi.object({
  staffUserId: Joi.number().integer().allow(null),
});

// ── Client ───────────────────────────────────────────────────────────────────
async function book(req, res, next) {
  try {
    const { error, value } = bookSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const appointment = await appointmentService.book(req.user.id, value);
    res.status(201).json({ appointment });
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const { status } = req.query;
    const appointments = await appointmentService.listByClient(req.user.id, { status });
    res.json({ appointments });
  } catch (err) {
    next(err);
  }
}

async function cancelMine(req, res, next) {
  try {
    const appointment = await appointmentService.cancelByClient(req.user.id, req.params.id);
    res.json({ appointment });
  } catch (err) {
    next(err);
  }
}

// ── Institution admin ────────────────────────────────────────────────────────
async function listForInstitution(req, res, next) {
  try {
    const { status, date } = req.query;
    const appointments = await appointmentService.listByInstitutionOwner(req.user.id, { status, date });
    res.json({ appointments });
  } catch (err) {
    next(err);
  }
}

async function assignStaff(req, res, next) {
  try {
    const { error, value } = assignSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const appointment = await appointmentService.assignStaff(req.user.id, req.params.id, value.staffUserId);
    res.json({ appointment });
  } catch (err) {
    next(err);
  }
}

async function getQueue(req, res, next) {
  try {
    const queue = await appointmentService.getQueueForInstitutionOwner(req.user.id);
    res.json({ queue });
  } catch (err) {
    next(err);
  }
}

async function callNext(req, res, next) {
  try {
    const appointment = await appointmentService.callNext(req.user.id, req.params.id);
    res.json({ appointment });
  } catch (err) {
    next(err);
  }
}

// ── Staff ────────────────────────────────────────────────────────────────────
async function listForStaff(req, res, next) {
  try {
    const { status, date } = req.query;
    const appointments = await appointmentService.listForStaff(req.user.id, { status, date });
    res.json({ appointments });
  } catch (err) {
    next(err);
  }
}

// ── Shared (institution_admin or staff with sufficient access) ──────────────
async function setStatus(req, res, next) {
  try {
    const { error, value } = statusSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const appointment = await appointmentService.setStatus(req.user, req.params.id, value.status);
    res.json({ appointment });
  } catch (err) {
    next(err);
  }
}

async function getQueuePosition(req, res, next) {
  try {
    const result = await appointmentService.getQueuePosition(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  book,
  listMine,
  cancelMine,
  listForInstitution,
  assignStaff,
  getQueue,
  callNext,
  listForStaff,
  setStatus,
  getQueuePosition,
};
