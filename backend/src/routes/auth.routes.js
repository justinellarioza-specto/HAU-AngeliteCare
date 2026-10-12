const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const s = require('../validators/schemas');

// Slow down password guessing: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

router.post('/login', loginLimiter, validate(s.login), ctrl.login);
router.get('/me', protect, ctrl.me);
router.patch('/me', protect, validate(s.updateMe), ctrl.updateMe);
router.patch('/me/password', protect, validate(s.changePassword), ctrl.changePassword);

module.exports = router;
