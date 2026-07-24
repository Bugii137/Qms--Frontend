const Joi = require('joi');
const authService = require('../services/authService');

// ── Validation schemas ──────────────────────────────────────────────────────
const registerSchema = Joi.object({
  fullName: Joi.string().min(2).max(150).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(30).allow('', null),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('client', 'institution_admin', 'staff').default('client'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

// ── Controllers ──────────────────────────────────────────────────────────────
async function register(req, res, next) {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await authService.register(value);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await authService.login(value);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const resetUrlBase = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password`;
    await authService.requestPasswordReset({ ...value, resetUrlBase });

    // Always respond the same way, whether or not the email was found.
    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    await authService.resetPassword(value);
    res.json({ message: 'Password has been reset. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getById(req.user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(150),
  phone: Joi.string().max(30).allow('', null),
}).min(1);

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

async function updateProfile(req, res, next) {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = await authService.updateProfile(req.user.id, value);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    await authService.changePassword(req.user.id, value);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, forgotPassword, resetPassword, me, updateProfile, changePassword };
