const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { jwtSecret } = require('../config/env');

// Verifies "Authorization: Bearer <token>" and attaches req.user
async function protect(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized('Login required');

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    throw ApiError.unauthorized('Session expired or invalid. Please log in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or deactivated');

  // Invalidate tokens issued before a password change
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
    throw ApiError.unauthorized('Password was changed. Please log in again.');
  }

  req.user = user;
  next();
}

// Usage: requireRole('admin') or requireRole('admin', 'nurse')
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw ApiError.forbidden();
    next();
  };
}

function signToken(user) {
  const { jwtExpiresIn } = require('../config/env');
  return jwt.sign({ sub: user._id.toString(), role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });
}

module.exports = { protect, requireRole, signToken };
