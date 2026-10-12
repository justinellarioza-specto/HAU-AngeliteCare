const router = require('express').Router();
const ctrl = require('../controllers/visitController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const s = require('../validators/schemas');

router.use(protect);

router.get('/', validate(s.listVisitsQuery, 'query'), ctrl.listVisits);
router.post('/', validate(s.createWalkIn), ctrl.createWalkIn);
router.get('/:id', ctrl.getVisit);
router.patch('/:id', validate(s.updateVisit), ctrl.updateVisit);

// Queue / status actions
router.post('/:id/call', ctrl.callVisit);
router.post('/:id/requeue', ctrl.requeueVisit);
router.post('/:id/no-show', ctrl.markNoShow);
router.post('/:id/cancel', validate(s.cancelVisit), ctrl.cancelVisit);
router.post('/:id/complete', validate(s.completeVisit), ctrl.completeVisit);

module.exports = router;
