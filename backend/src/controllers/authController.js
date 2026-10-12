const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const audit = require('../utils/audit');
const { signToken } = require('../middleware/auth');

// POST /api/auth/login
async function login(req, res) {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid username or password');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  req.user = user;
  audit(req, 'auth.login', 'User', user._id);

  res.json({ success: true, token: signToken(user), user });
}

// GET /api/auth/me
async function me(req, res) {
  res.json({ success: true, user: req.user });
}

// PATCH /api/auth/me — update own name / email / position
async function updateMe(req, res) {
  Object.assign(req.user, req.body);
  await req.user.save();
  audit(req, 'auth.update_profile', 'User', req.user._id, { fields: Object.keys(req.body) });
  res.json({ success: true, user: req.user });
}

// PATCH /api/auth/me/password
async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.password = req.body.newPassword;
  await user.save();
  audit(req, 'auth.change_password', 'User', user._id);

  // Old tokens are now invalid, so return a fresh one
  res.json({ success: true, message: 'Password updated', token: signToken(user) });
}

module.exports = { login, me, updateMe, changePassword };
