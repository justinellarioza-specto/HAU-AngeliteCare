const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { protect, requireRole } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

router.use(protect);

router.get('/summary', ctrl.summary);
router.get('/reports', ctrl.reports);
router.get('/audit-logs', requireRole(ROLES.ADMIN), ctrl.auditLogs);

module.exports = router;
