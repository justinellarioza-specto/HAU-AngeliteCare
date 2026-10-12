const Visit = require('../models/Visit');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const audit = require('../utils/audit');
const { VISIT_STATUS, SOURCES } = require('../utils/constants');
const { localDateKey, parseLocalDate, addDays } = require('../utils/dates');
const { getPagination, paged, escapeRegex } = require('../utils/pagination');
const { QUEUE_SORT, createVisit, dispenseItems } = require('../services/visitService');

const PATIENT_QUEUE_FIELDS = 'studentNumber firstName middleName lastName program yearLevel section sex allergies medicalConditions isProfileComplete';

async function findVisitOr404(id) {
  const visit = await Visit.findById(id);
  if (!visit) throw ApiError.notFound('Visit not found');
  return visit;
}

// Atomic status change: only succeeds if the visit is still in one of the `from` statuses.
// Prevents two staff members from calling / completing the same ticket at the same time.
async function transition(id, from, update) {
  const visit = await Visit.findOneAndUpdate(
    { _id: id, status: { $in: from } },
    { $set: update },
    { new: true }
  );
  if (!visit) {
    const current = await Visit.findById(id).select('status queueNumber');
    if (!current) throw ApiError.notFound('Visit not found');
    throw ApiError.conflict(`Visit ${current.queueNumber} is already "${current.status}"`);
  }
  return visit;
}

// ---------------- Queue ----------------

// GET /api/queue — today's live queue for the admin/nurse screen
async function getQueue(_req, res) {
  const today = localDateKey();
  const [waiting, inProgress, statusCounts] = await Promise.all([
    Visit.find({ queueDate: today, status: VISIT_STATUS.WAITING })
      .sort(QUEUE_SORT)
      .populate('patient', PATIENT_QUEUE_FIELDS),
    Visit.find({ queueDate: today, status: VISIT_STATUS.IN_PROGRESS })
      .sort({ calledAt: 1 })
      .populate('patient', PATIENT_QUEUE_FIELDS)
      .populate('handledBy', 'fullName'),
    Visit.aggregate([{ $match: { queueDate: today } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const counts = Object.fromEntries(Object.values(VISIT_STATUS).map((s) => [s, 0]));
  statusCounts.forEach((c) => { counts[c._id] = c.count; });

  res.json({ success: true, date: today, counts, inProgress, waiting });
}

// POST /api/queue/next { requestType? } — call the next student in line
async function callNext(req, res) {
  const filter = { queueDate: localDateKey(), status: VISIT_STATUS.WAITING };
  if (req.body.requestType) filter.requestType = req.body.requestType;

  // Retry a few times in case another staff member grabs the same ticket first
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = await Visit.findOne(filter).sort(QUEUE_SORT).select('_id');
    if (!candidate) return res.json({ success: true, data: null, message: 'No one is waiting in the queue' });

    const visit = await Visit.findOneAndUpdate(
      { _id: candidate._id, status: VISIT_STATUS.WAITING },
      { $set: { status: VISIT_STATUS.IN_PROGRESS, calledAt: new Date(), handledBy: req.user._id } },
      { new: true }
    ).populate('patient', PATIENT_QUEUE_FIELDS);

    if (visit) {
      audit(req, 'visit.call', 'Visit', visit._id, { queueNumber: visit.queueNumber });
      return res.json({ success: true, data: visit });
    }
  }
  throw ApiError.conflict('Queue changed while calling the next student. Please try again.');
}

// POST /api/visits/:id/call — call a specific ticket
async function callVisit(req, res) {
  const visit = await transition(req.params.id, [VISIT_STATUS.WAITING], {
    status: VISIT_STATUS.IN_PROGRESS,
    calledAt: new Date(),
    handledBy: req.user._id,
  });
  audit(req, 'visit.call', 'Visit', visit._id, { queueNumber: visit.queueNumber });
  res.json({ success: true, data: await visit.populate('patient', PATIENT_QUEUE_FIELDS) });
}

// POST /api/visits/:id/requeue — send back to the waiting list (e.g. student stepped out)
async function requeueVisit(req, res) {
  const visit = await transition(req.params.id, [VISIT_STATUS.IN_PROGRESS], { status: VISIT_STATUS.WAITING });
  audit(req, 'visit.requeue', 'Visit', visit._id);
  res.json({ success: true, data: visit });
}

// POST /api/visits/:id/no-show
async function markNoShow(req, res) {
  const visit = await transition(req.params.id, [VISIT_STATUS.WAITING, VISIT_STATUS.IN_PROGRESS], {
    status: VISIT_STATUS.NO_SHOW,
    handledBy: req.user._id,
  });
  audit(req, 'visit.no_show', 'Visit', visit._id);
  res.json({ success: true, data: visit });
}

// POST /api/visits/:id/cancel { reason }
async function cancelVisit(req, res) {
  const visit = await transition(req.params.id, [VISIT_STATUS.WAITING, VISIT_STATUS.IN_PROGRESS], {
    status: VISIT_STATUS.CANCELLED,
    cancelReason: req.body.reason || 'Cancelled by clinic staff',
    handledBy: req.user._id,
  });
  audit(req, 'visit.cancel', 'Visit', visit._id, { reason: visit.cancelReason });
  res.json({ success: true, data: visit });
}

// ---------------- Visits / consultation records ----------------

// GET /api/visits?status=&requestType=&studentNumber=&search=&from=YYYY-MM-DD&to=YYYY-MM-DD
async function listVisits(req, res) {
  const q = req.validatedQuery;
  const pg = getPagination(q);
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.requestType) filter.requestType = q.requestType;
  if (q.studentNumber) filter.studentNumber = q.studentNumber;

  const from = parseLocalDate(q.from);
  const to = parseLocalDate(q.to);
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lt = addDays(to, 1); // inclusive of the "to" day
  }

  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    const patients = await Patient.find({ $or: [{ firstName: rx }, { lastName: rx }] }).select('_id').limit(200);
    filter.$or = [
      { studentNumber: rx },
      { queueNumber: rx },
      { reason: rx },
      { assessment: rx },
      { patient: { $in: patients.map((p) => p._id) } },
    ];
  }

  const [items, total] = await Promise.all([
    Visit.find(filter)
      .sort({ createdAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .populate('patient', 'studentNumber firstName middleName lastName program section')
      .populate('handledBy', 'fullName'),
    Visit.countDocuments(filter),
  ]);
  res.json({ success: true, ...paged(items, total, pg) });
}

// POST /api/visits — staff encodes a walk-in (student already has a patient record)
async function createWalkIn(req, res) {
  const { studentNumber, addToQueue, ...rest } = req.body;
  const patient = await Patient.findOne({ studentNumber });
  if (!patient) {
    throw ApiError.notFound(`No patient record for ${studentNumber}. Register the patient first via POST /api/patients.`);
  }

  const visit = await createVisit({
    patient,
    ...rest,
    source: SOURCES.WALK_IN,
    createdBy: req.user._id,
    status: addToQueue ? VISIT_STATUS.WAITING : VISIT_STATUS.IN_PROGRESS,
    handledBy: addToQueue ? undefined : req.user._id,
  });
  audit(req, 'visit.create', 'Visit', visit._id, { studentNumber, queueNumber: visit.queueNumber });
  res.status(201).json({ success: true, data: visit });
}

// GET /api/visits/:id — full consultation record
async function getVisit(req, res) {
  const visit = await Visit.findById(req.params.id)
    .populate('patient')
    .populate('handledBy', 'fullName position')
    .populate('createdBy', 'fullName');
  if (!visit) throw ApiError.notFound('Visit not found');
  audit(req, 'visit.view', 'Visit', visit._id, { studentNumber: visit.studentNumber });
  res.json({ success: true, data: visit });
}

function applyClinicalFields(visit, body) {
  const { vitals, ...rest } = body;
  if (vitals) visit.vitals = { ...(visit.vitals?.toObject?.() || {}), ...vitals };
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined) visit[key] = value;
  });
}

// PATCH /api/visits/:id — record vitals / notes while attending, or correct a completed record
async function updateVisit(req, res) {
  const visit = await findVisitOr404(req.params.id);
  if ([VISIT_STATUS.CANCELLED, VISIT_STATUS.NO_SHOW].includes(visit.status)) {
    throw ApiError.badRequest(`Cannot edit a visit that is "${visit.status}"`);
  }
  applyClinicalFields(visit, req.body);
  await visit.save();
  audit(req, 'visit.update', 'Visit', visit._id, { fields: Object.keys(req.body) });
  res.json({ success: true, data: visit });
}

// POST /api/visits/:id/complete — finish the consultation, dispense items, save to history
async function completeVisit(req, res) {
  const visit = await findVisitOr404(req.params.id);
  if (visit.status !== VISIT_STATUS.IN_PROGRESS) {
    throw ApiError.badRequest(
      visit.status === VISIT_STATUS.WAITING
        ? 'Call this ticket first before completing it'
        : `Visit is already "${visit.status}"`
    );
  }

  const { dispensed, ...clinical } = req.body;
  applyClinicalFields(visit, clinical);
  await visit.validate(); // validate clinical fields before touching inventory

  // Lock the ticket so a second "complete" click can't dispense twice
  const locked = await Visit.findOneAndUpdate(
    { _id: visit._id, status: VISIT_STATUS.IN_PROGRESS, completedAt: { $exists: false } },
    { $set: { completedAt: new Date() } },
    { new: true }
  );
  if (!locked) throw ApiError.conflict('This visit is already being completed');

  try {
    visit.dispensed = await dispenseItems(visit, dispensed, req.user);
  } catch (err) {
    await Visit.updateOne({ _id: visit._id }, { $unset: { completedAt: 1 } });
    throw err;
  }

  visit.status = VISIT_STATUS.COMPLETED;
  visit.completedAt = locked.completedAt;
  visit.handledBy = visit.handledBy || req.user._id;
  await visit.save();
  await Patient.updateOne({ _id: visit.patient }, { $set: { lastVisitAt: visit.completedAt } });

  audit(req, 'visit.complete', 'Visit', visit._id, {
    queueNumber: visit.queueNumber,
    dispensed: visit.dispensed.map((d) => `${d.quantity} ${d.unit} ${d.name}`),
  });
  const result = await Visit.findById(visit._id).populate('patient', PATIENT_QUEUE_FIELDS).populate('handledBy', 'fullName');
  res.json({ success: true, data: result });
}

module.exports = {
  getQueue,
  callNext,
  callVisit,
  requeueVisit,
  markNoShow,
  cancelVisit,
  listVisits,
  createWalkIn,
  getVisit,
  updateVisit,
  completeVisit,
};
