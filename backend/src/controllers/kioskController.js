// Student-facing endpoints (no login). Students identify themselves with their student number.
// These responses intentionally expose as little personal/health info as possible (RA 10173).
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Visit = require('../models/Visit');
const InventoryItem = require('../models/InventoryItem');
const ApiError = require('../utils/ApiError');
const { REQUEST_TYPE_LABELS, VISIT_STATUS, SOURCES } = require('../utils/constants');
const { localDateKey } = require('../utils/dates');
const { createVisit, queuePosition, findActiveVisitToday, QUEUE_SORT } = require('../services/visitService');

function displayName(patient) {
  return `${patient.firstName} ${patient.lastName.charAt(0)}.`;
}

function publicTicket(visit, position) {
  return {
    id: visit._id,
    queueNumber: visit.queueNumber,
    requestType: visit.requestType,
    requestTypeLabel: REQUEST_TYPE_LABELS[visit.requestType],
    status: visit.status,
    position, // 1 = next in line, 0 = not waiting anymore
    createdAt: visit.createdAt,
  };
}

// GET /api/kiosk/options — what the request form needs
async function getOptions(_req, res) {
  const items = await InventoryItem.find({ isActive: true, isRequestable: true })
    .select('name category unit dosageForm strength batches reorderLevel totalQuantity')
    .sort({ category: 1, name: 1 });

  res.json({
    success: true,
    requestTypes: Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => ({ value, label })),
    items: items.map((i) => ({
      _id: i._id,
      name: i.name,
      category: i.category,
      unit: i.unit,
      dosageForm: i.dosageForm,
      strength: i.strength,
      inStock: i.availableQuantity > 0,
    })),
  });
}

// POST /api/kiosk/lookup { studentNumber }
async function lookup(req, res) {
  const patient = await Patient.findOne({ studentNumber: req.body.studentNumber });
  if (!patient) return res.json({ success: true, registered: false });

  const active = await findActiveVisitToday(patient._id);
  res.json({
    success: true,
    registered: true,
    displayName: displayName(patient),
    activeRequest: active ? publicTicket(active, await queuePosition(active)) : null,
  });
}

// POST /api/kiosk/requests
async function submitRequest(req, res) {
  const { studentNumber, requestType, reason, requestedItems, patient: newPatient } = req.body;

  let patient = await Patient.findOne({ studentNumber });
  if (!patient) {
    if (!newPatient) {
      throw new ApiError(422, 'First clinic visit — please provide your name so the clinic can create your record.', {
        code: 'NEEDS_REGISTRATION',
        requiredFields: ['patient.firstName', 'patient.lastName'],
      });
    }
    patient = await Patient.create({ studentNumber, ...newPatient, isProfileComplete: false });
  }

  const visit = await createVisit({ patient, requestType, reason, requestedItems, source: SOURCES.KIOSK });
  res.status(201).json({
    success: true,
    message: `Request submitted. Your queue number is ${visit.queueNumber}.`,
    displayName: displayName(patient),
    ticket: publicTicket(visit, await queuePosition(visit)),
  });
}

async function findTicket(id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Ticket not found');
  const visit = await Visit.findById(id);
  if (!visit) throw ApiError.notFound('Ticket not found');
  return visit;
}

// GET /api/kiosk/requests/:id — status polling for the student's ticket
async function getTicket(req, res) {
  const visit = await findTicket(req.params.id);
  res.json({ success: true, ticket: publicTicket(visit, await queuePosition(visit)) });
}

// POST /api/kiosk/requests/:id/cancel { studentNumber }
async function cancelTicket(req, res) {
  const visit = await findTicket(req.params.id);
  if (visit.studentNumber !== req.body.studentNumber) throw ApiError.forbidden('Student number does not match this ticket');
  if (visit.status !== VISIT_STATUS.WAITING) throw ApiError.badRequest('Only requests still waiting in the queue can be cancelled');

  visit.status = VISIT_STATUS.CANCELLED;
  visit.cancelReason = 'Cancelled by student';
  await visit.save();
  res.json({ success: true, ticket: publicTicket(visit, 0) });
}

// GET /api/kiosk/queue-board — for a TV/monitor in the clinic. Queue numbers only, no names.
async function queueBoard(_req, res) {
  const today = localDateKey();
  const [serving, waiting] = await Promise.all([
    Visit.find({ queueDate: today, status: VISIT_STATUS.IN_PROGRESS }).sort({ calledAt: 1 }).select('queueNumber requestType calledAt'),
    Visit.find({ queueDate: today, status: VISIT_STATUS.WAITING }).sort(QUEUE_SORT).select('queueNumber requestType'),
  ]);
  res.json({
    success: true,
    date: today,
    nowServing: serving.map((v) => ({ queueNumber: v.queueNumber, requestType: v.requestType })),
    waiting: waiting.map((v) => ({ queueNumber: v.queueNumber, requestType: v.requestType })),
    waitingCount: waiting.length,
  });
}

module.exports = { getOptions, lookup, submitRequest, getTicket, cancelTicket, queueBoard };
