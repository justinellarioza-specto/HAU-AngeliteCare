const Visit = require('../models/Visit');
const Counter = require('../models/Counter');
const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');
const ApiError = require('../utils/ApiError');
const { QUEUE_PREFIX, VISIT_STATUS, ACTIVE_STATUSES, MOVEMENT_TYPES } = require('../utils/constants');
const { localDateKey } = require('../utils/dates');

// Order of today's queue: urgent first, then first-come-first-served
const QUEUE_SORT = { priority: -1, createdAt: 1 };

async function nextQueueNumber(requestType, dateKey = localDateKey()) {
  const prefix = QUEUE_PREFIX[requestType] || 'O';
  const seq = await Counter.next(`queue:${dateKey}:${prefix}`);
  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

// Fill in names for requested inventory items so the record stays readable even if the item is renamed later
async function resolveRequestedItems(requestedItems = []) {
  if (!requestedItems.length) return [];
  const ids = requestedItems.filter((r) => r.item).map((r) => r.item);
  const items = await InventoryItem.find({ _id: { $in: ids }, isActive: true }).select('name');
  const byId = new Map(items.map((i) => [i._id.toString(), i]));
  return requestedItems.map((r) => {
    if (r.item) {
      const found = byId.get(r.item.toString());
      if (!found) throw ApiError.badRequest(`Requested item not found: ${r.item}`);
      return { item: found._id, name: found.name, quantity: r.quantity };
    }
    return { name: r.name, quantity: r.quantity };
  });
}

async function findActiveVisitToday(patientId) {
  return Visit.findOne({
    patient: patientId,
    queueDate: localDateKey(),
    status: { $in: ACTIVE_STATUSES },
  });
}

async function createVisit({ patient, requestType, reason, requestedItems, source, priority = 'normal', status, createdBy, handledBy }) {
  const existing = await findActiveVisitToday(patient._id);
  if (existing) {
    throw ApiError.conflict(
      `This student already has an active request today (queue no. ${existing.queueNumber}).`,
      { visitId: existing._id, queueNumber: existing.queueNumber, status: existing.status }
    );
  }

  const queueDate = localDateKey();
  const visit = await Visit.create({
    patient: patient._id,
    studentNumber: patient.studentNumber,
    queueNumber: await nextQueueNumber(requestType, queueDate),
    queueDate,
    priority,
    source,
    requestType,
    reason,
    requestedItems: await resolveRequestedItems(requestedItems),
    status: status || VISIT_STATUS.WAITING,
    createdBy,
    handledBy,
    calledAt: status === VISIT_STATUS.IN_PROGRESS ? new Date() : undefined,
  });
  return visit;
}

// 1-based position among today's waiting visits (0 if not waiting)
async function queuePosition(visit) {
  if (visit.status !== VISIT_STATUS.WAITING) return 0;
  const base = { queueDate: visit.queueDate, status: VISIT_STATUS.WAITING, _id: { $ne: visit._id } };
  const ahead = visit.priority === 'urgent'
    ? await Visit.countDocuments({ ...base, priority: 'urgent', createdAt: { $lt: visit.createdAt } })
    : await Visit.countDocuments({
      ...base,
      $or: [{ priority: 'urgent' }, { priority: 'normal', createdAt: { $lt: visit.createdAt } }],
    });
  return ahead + 1;
}

/**
 * Deduct dispensed items from inventory (FEFO) and write stock movements.
 * All lines are checked first so we never partially dispense.
 */
async function dispenseItems(visit, lines, user) {
  if (!lines.length) return [];

  // Merge duplicate lines for the same item
  const merged = new Map();
  for (const line of lines) {
    const key = line.item.toString();
    const prev = merged.get(key);
    merged.set(key, {
      item: key,
      quantity: (prev?.quantity || 0) + line.quantity,
      instructions: [prev?.instructions, line.instructions].filter(Boolean).join('; ') || undefined,
    });
  }

  const items = await InventoryItem.find({ _id: { $in: [...merged.keys()] }, isActive: true });
  const byId = new Map(items.map((i) => [i._id.toString(), i]));

  const plans = [];
  const problems = [];
  for (const line of merged.values()) {
    const item = byId.get(line.item);
    if (!item) {
      problems.push({ item: line.item, message: 'Item not found or inactive' });
      continue;
    }
    const { plan, shortBy } = item.planDeduction(line.quantity);
    if (shortBy > 0) {
      problems.push({
        item: line.item,
        name: item.name,
        message: `Not enough non-expired stock: requested ${line.quantity}, available ${line.quantity - shortBy} ${item.unit}`,
      });
      continue;
    }
    plans.push({ item, line, plan });
  }
  if (problems.length) throw ApiError.badRequest('Cannot dispense — insufficient stock', problems);

  const dispensed = [];
  for (const { item, line, plan } of plans) {
    item.applyDeduction(plan);
    await item.save(); // optimisticConcurrency throws VersionError if someone else changed it meanwhile

    await StockMovement.insertMany(
      plan.map((p) => ({
        item: item._id,
        itemName: item.name,
        type: MOVEMENT_TYPES.DISPENSE,
        quantity: -p.quantity,
        lotNumber: p.lotNumber,
        expirationDate: p.expirationDate,
        balanceAfter: item.totalQuantity,
        reason: `Dispensed to ${visit.studentNumber} (${visit.queueNumber})`,
        visit: visit._id,
        performedBy: user._id,
      }))
    );

    dispensed.push({
      item: item._id,
      name: item.name,
      unit: item.unit,
      quantity: line.quantity,
      instructions: line.instructions,
      batches: plan.map((p) => ({ lotNumber: p.lotNumber, expirationDate: p.expirationDate, quantity: p.quantity })),
    });
  }
  return dispensed;
}

module.exports = { QUEUE_SORT, createVisit, queuePosition, dispenseItems, findActiveVisitToday };
