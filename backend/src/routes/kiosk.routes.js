const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/kioskController');
const validate = require('../middleware/validate');
const s = require('../validators/schemas');

// Public (no login) — students only type their student number.
const kioskLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please wait a moment.' },
});
router.use(kioskLimiter);

router.get('/options', ctrl.getOptions);
router.get('/queue-board', ctrl.queueBoard);
router.post('/lookup', validate(s.kioskLookup), ctrl.lookup);
router.post('/requests', validate(s.kioskRequest), ctrl.submitRequest);
router.get('/requests/:id', ctrl.getTicket);
router.post('/requests/:id/cancel', validate(s.kioskCancel), ctrl.cancelTicket);

module.exports = router;
