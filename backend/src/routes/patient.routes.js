const router = require('express').Router();
const ctrl = require('../controllers/patientController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const s = require('../validators/schemas');

router.use(protect); // any clinic staff

router.get('/', ctrl.listPatients);
router.post('/', validate(s.createPatient), ctrl.createPatient);
router.get('/:studentNumber', ctrl.getPatient);
router.patch('/:studentNumber', validate(s.updatePatient), ctrl.updatePatient);
router.get('/:studentNumber/visits', ctrl.getPatientHistory);

module.exports = router;
