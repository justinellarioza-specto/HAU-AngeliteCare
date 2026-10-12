const Visit = require('../models/Visit');
const Patient = require('../models/Patient');
const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');
const AuditLog = require('../models/AuditLog');
const { VISIT_STATUS, MOVEMENT_TYPES } = require('../utils/constants');
const { localDateKey, parseLocalDate, addDays, dayRange } = require('../utils/dates');
const { expiryWarningDays } = require('../config/env');
const { getPagination, paged } = require('../utils/pagination');

function avgMinutes(pairs) {
  const valid = pairs.filter(([a, b]) => a && b);
  if (!valid.length) return null;
  const total = valid.reduce((sum, [a, b]) => sum + (b - a), 0);
  return Math.round(total / valid.length / 60000);
}

// GET /api/dashboard/summary — numbers for the landing page widgets
async function summary(_req, res) {
  const today = localDateKey();
  const now = new Date();
  const warnUntil = addDays(now, expiryWarningDays);

  const [todayVisits, totalPatients, incompleteProfiles, items] = await Promise.all([
    Visit.find({ queueDate: today }).select('status requestType createdAt calledAt completedAt'),
    Patient.countDocuments(),
    Patient.countDocuments({ isProfileComplete: false }),
    InventoryItem.find({ isActive: true }),
  ]);

  const byStatus = Object.fromEntries(Object.values(VISIT_STATUS).map((s) => [s, 0]));
  const byType = {};
  todayVisits.forEach((v) => {
    byStatus[v.status] += 1;
    byType[v.requestType] = (byType[v.requestType] || 0) + 1;
  });

  let lowStock = 0;
  let expiringSoon = 0;
  let expired = 0;
  items.forEach((item) => {
    if (item.availableQuantity <= item.reorderLevel) lowStock += 1;
    if (item.batches.some((b) => b.expirationDate && b.expirationDate > now && b.expirationDate <= warnUntil)) expiringSoon += 1;
    if (item.batches.some((b) => b.expirationDate && b.expirationDate <= now)) expired += 1;
  });

  res.json({
    success: true,
    date: today,
    today: {
      total: todayVisits.length,
      byStatus,
      byType,
      avgWaitMinutes: avgMinutes(todayVisits.map((v) => [v.createdAt, v.calledAt])),
      avgConsultMinutes: avgMinutes(
        todayVisits.filter((v) => v.status === VISIT_STATUS.COMPLETED).map((v) => [v.calledAt, v.completedAt])
      ),
    },
    patients: { total: totalPatients, incompleteProfiles },
    inventory: { activeItems: items.length, lowStock, expiringSoon, itemsWithExpiredStock: expired },
  });
}

// GET /api/dashboard/reports?from=YYYY-MM-DD&to=YYYY-MM-DD — defaults to the last 30 days
async function reports(req, res) {
  const to = parseLocalDate(req.query.to) || dayRange().start;
  const from = parseLocalDate(req.query.from) || addDays(to, -29);
  const end = addDays(to, 1);
  const range = { $gte: from, $lt: end };

  const [visits, dispensed] = await Promise.all([
    Visit.find({ createdAt: range }).select('status requestType queueDate'),
    StockMovement.find({ type: MOVEMENT_TYPES.DISPENSE, createdAt: range }).select('item itemName quantity'),
  ]);

  const perDay = {};
  const perType = {};
  const perStatus = {};
  visits.forEach((v) => {
    perDay[v.queueDate] = (perDay[v.queueDate] || 0) + 1;
    perType[v.requestType] = (perType[v.requestType] || 0) + 1;
    perStatus[v.status] = (perStatus[v.status] || 0) + 1;
  });

  const usage = new Map();
  dispensed.forEach((m) => {
    const key = m.item.toString();
    const prev = usage.get(key) || { item: m.item, name: m.itemName, quantity: 0 };
    prev.quantity += Math.abs(m.quantity);
    usage.set(key, prev);
  });

  res.json({
    success: true,
    range: { from: localDateKey(from), to: localDateKey(to) },
    totalVisits: visits.length,
    visitsPerDay: Object.entries(perDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    visitsByType: perType,
    visitsByStatus: perStatus,
    topDispensedItems: [...usage.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
  });
}

// GET /api/audit-logs?action=&entity=&entityId=  (admin only)
async function auditLogs(req, res) {
  const pg = getPagination(req.query, 50);
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.entity) filter.entity = req.query.entity;
  if (req.query.entityId) filter.entityId = req.query.entityId;
  if (req.query.user) filter.user = req.query.user;

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ success: true, ...paged(items, total, pg) });
}

module.exports = { summary, reports, auditLogs };
