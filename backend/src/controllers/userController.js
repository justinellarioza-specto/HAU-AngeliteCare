const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const audit = require('../utils/audit');
const { ROLES } = require('../utils/constants');

// GET /api/users
async function listUsers(_req, res) {
  const users = await User.find().sort({ fullName: 1 });
  res.json({ success: true, data: users });
}

// POST /api/users
async function createUser(req, res) {
  const user = await User.create(req.body);
  audit(req, 'user.create', 'User', user._id, { username: user.username, role: user.role });
  res.status(201).json({ success: true, data: user });
}

async function ensureNotLastAdmin(target, changes) {
  const losingAdmin = target.role === ROLES.ADMIN
    && ((changes.role && changes.role !== ROLES.ADMIN) || changes.isActive === false);
  if (!losingAdmin) return;
  const otherAdmins = await User.countDocuments({ role: ROLES.ADMIN, isActive: true, _id: { $ne: target._id } });
  if (otherAdmins === 0) throw ApiError.badRequest('There must be at least one active admin account');
}

// PATCH /api/users/:id
async function updateUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  await ensureNotLastAdmin(user, req.body);

  Object.assign(user, req.body);
  await user.save();
  audit(req, 'user.update', 'User', user._id, req.body);
  res.json({ success: true, data: user });
}

// PATCH /api/users/:id/reset-password
async function resetPassword(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  user.password = req.body.newPassword;
  await user.save();
  audit(req, 'user.reset_password', 'User', user._id);
  res.json({ success: true, message: `Password reset for ${user.username}` });
}

module.exports = { listUsers, createUser, updateUser, resetPassword };
