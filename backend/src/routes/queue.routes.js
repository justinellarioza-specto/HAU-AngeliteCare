const router = require('express').Router();
const ctrl = require('../controllers/visitController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const s = require('../validators/schemas');

router.use(protect);

router.get('/', ctrl.getQueue);
router.post('/next', validate(s.callNext), ctrl.callNext);

module.exports = router;
