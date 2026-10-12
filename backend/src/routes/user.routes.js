const router = require('express').Router();
const ctrl = require('../controllers/userController');
const validate = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const s = require('../validators/schemas');

// Staff account management — admin only
router.use(protect, requireRole(ROLES.ADMIN));

router.get('/', ctrl.listUsers);
router.post('/', validate(s.createUser), ctrl.createUser);
router.patch('/:id', validate(s.updateUser), ctrl.updateUser);
router.patch('/:id/reset-password', validate(s.resetPassword), ctrl.resetPassword);

module.exports = router;
