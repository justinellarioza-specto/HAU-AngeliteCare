const router = require('express').Router();
const ctrl = require('../controllers/inventoryController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const s = require('../validators/schemas');

router.use(protect);

router.get('/', validate(s.listItemsQuery, 'query'), ctrl.listItems);
router.post('/', validate(s.createItem), ctrl.createItem);
router.get('/alerts', ctrl.getAlerts);
router.get('/movements', ctrl.listMovements);
router.get('/:id', ctrl.getItem);
router.patch('/:id', validate(s.updateItem), ctrl.updateItem);
router.delete('/:id', ctrl.deactivateItem);
router.post('/:id/restock', validate(s.restock), ctrl.restock);
router.post('/:id/adjust', validate(s.adjustStock), ctrl.adjustStock);
router.post('/:id/dispose-expired', ctrl.disposeExpired);
router.get('/:id/movements', ctrl.listMovements);

module.exports = router;
