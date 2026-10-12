const router = require('express').Router();
const mongoose = require('mongoose');
const {
  ROLES, REQUEST_TYPES, REQUEST_TYPE_LABELS, VISIT_STATUS, ITEM_CATEGORIES, MOVEMENT_TYPES,
} = require('../utils/constants');

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
});

// Enum values for the frontend (dropdowns, badges)
router.get('/meta', (_req, res) => {
  res.json({
    success: true,
    roles: Object.values(ROLES),
    requestTypes: Object.values(REQUEST_TYPES).map((v) => ({ value: v, label: REQUEST_TYPE_LABELS[v] })),
    visitStatuses: Object.values(VISIT_STATUS),
    itemCategories: Object.values(ITEM_CATEGORIES),
    movementTypes: Object.values(MOVEMENT_TYPES),
  });
});

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/kiosk', require('./kiosk.routes'));
router.use('/patients', require('./patient.routes'));
router.use('/queue', require('./queue.routes'));
router.use('/visits', require('./visit.routes'));
router.use('/inventory', require('./inventory.routes'));
router.use('/dashboard', require('./dashboard.routes'));

module.exports = router;
