const Patient = require('../models/Patient');
const Visit = require('../models/Visit');
const ApiError = require('../utils/ApiError');
const audit = require('../utils/audit');
const { getPagination, paged, escapeRegex } = require('../utils/pagination');
const { VISIT_STATUS } = require('../utils/constants');

async function findPatientOr404(studentNumber) {
  const patient = await Patient.findOne({ studentNumber: String(studentNumber).toUpperCase() });
  if (!patient) throw ApiError.notFound(`No patient record for student number ${studentNumber}`);
  return patient;
}

// GET /api/patients?search=&incomplete=true&page=&limit=
async function listPatients(req, res) {
  const pg = getPagination(req.query);
  const filter = {};
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ studentNumber: rx }, { firstName: rx }, { lastName: rx }, { program: rx }, { section: rx }];
  }
  if (req.query.incomplete === 'true') filter.isProfileComplete = false;

  const [items, total] = await Promise.all([
    Patient.find(filter)
      .select('studentNumber patientType firstName middleName lastName program yearLevel section sex isProfileComplete lastVisitAt')
      .sort({ lastName: 1, firstName: 1 })
      .skip(pg.skip)
      .limit(pg.limit),
    Patient.countDocuments(filter),
  ]);
  res.json({ success: true, ...paged(items, total, pg) });
}

// POST /api/patients
async function createPatient(req, res) {
  const patient = await Patient.create({ ...req.body, createdBy: req.user._id, isProfileComplete: true });
  audit(req, 'patient.create', 'Patient', patient._id, { studentNumber: patient.studentNumber });
  res.status(201).json({ success: true, data: patient });
}

// GET /api/patients/:studentNumber  — full profile + visit summary
async function getPatient(req, res) {
  const patient = await findPatientOr404(req.params.studentNumber);

  const [totalVisits, lastVisits, byType] = await Promise.all([
    Visit.countDocuments({ patient: patient._id, status: VISIT_STATUS.COMPLETED }),
    Visit.find({ patient: patient._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('queueNumber requestType reason status assessment createdAt completedAt'),
    Visit.aggregate([
      { $match: { patient: patient._id, status: VISIT_STATUS.COMPLETED } },
      { $group: { _id: '$requestType', count: { $sum: 1 } } },
    ]),
  ]);

  audit(req, 'patient.view', 'Patient', patient._id, { studentNumber: patient.studentNumber });
  res.json({
    success: true,
    data: patient,
    summary: {
      totalCompletedVisits: totalVisits,
      visitsByType: Object.fromEntries(byType.map((b) => [b._id, b.count])),
      recentVisits: lastVisits,
    },
  });
}

// PATCH /api/patients/:studentNumber
async function updatePatient(req, res) {
  const patient = await findPatientOr404(req.params.studentNumber);
  Object.assign(patient, req.body, { updatedBy: req.user._id });
  if (patient.firstName && patient.lastName && patient.sex && patient.birthDate) patient.isProfileComplete = true;
  await patient.save();
  audit(req, 'patient.update', 'Patient', patient._id, { fields: Object.keys(req.body) });
  res.json({ success: true, data: patient });
}

// GET /api/patients/:studentNumber/visits  — the medical history
async function getPatientHistory(req, res) {
  const patient = await findPatientOr404(req.params.studentNumber);
  const pg = getPagination(req.query, 20);
  const filter = { patient: patient._id };
  if (req.query.status) filter.status = req.query.status;
  else if (req.query.all !== 'true') filter.status = VISIT_STATUS.COMPLETED;
  if (req.query.requestType) filter.requestType = req.query.requestType;

  const [items, total] = await Promise.all([
    Visit.find(filter)
      .sort({ createdAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .populate('handledBy', 'fullName position'),
    Visit.countDocuments(filter),
  ]);

  audit(req, 'patient.view_history', 'Patient', patient._id, { studentNumber: patient.studentNumber });
  res.json({
    success: true,
    patient: { _id: patient._id, studentNumber: patient.studentNumber, fullName: patient.fullName, allergies: patient.allergies },
    ...paged(items, total, pg),
  });
}

module.exports = { listPatients, createPatient, getPatient, updatePatient, getPatientHistory, findPatientOr404 };
