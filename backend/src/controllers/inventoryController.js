const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');
const ApiError = require('../utils/ApiError');
const audit = require('../utils/audit');
const { MOVEMENT_TYPES } = require('../utils/constants');
const { expiryWarningDays } = require('../config/env');
const { addDays } = require('../utils/dates');
const { getPagination, paged, escapeRegex } = require('../utils/pagination');

async function findItemOr404(id) {
  const item = await InventoryItem.findById(id);
  if (!item) throw ApiError.notFound('Inventory item not found');
  return item;
}

function logMovement(item, user, data) {
  return StockMovement.create({
    item: item._id,
    itemName: item.name,
    balanceAfter: item.totalQuantity,
    performedBy: user._id,
    ...data,
  });
}

function stockStatus(item, now = new Date(), warnUntil = addDays(now, expiryWarningDays)) {
  const expiring = item.batches.some((b) => b.expirationDate && b.expirationDate > now && b.expirationDate <= warnUntil);
  const expired = item.batches.some((b) => b.expirationDate && b.expirationDate <= now);
  return {
    out: item.availableQuantity === 0,
    low: item.availableQuantity <= item.reorderLevel,
    expiring,
    expired,
  };
}

// GET /api/inventory?category=&search=&stock=low|out|expiring|expired&includeInactive=true
async function listItems(req, res) {
  const q = req.validatedQuery;
  const filter = {};
  if (q.includeInactive !== 'true') filter.isActive = true;
  if (q.category) filter.category = q.category;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: rx }, { genericName: rx }, { brandName: rx }];
  }

  let items = await InventoryItem.find(filter).sort({ name: 1 });
  const now = new Date();
  const withStatus = items.map((i) => ({ doc: i, status: stockStatus(i, now) }));
  const filtered = q.stock ? withStatus.filter((x) => x.status[q.stock]) : withStatus;

  const pg = getPagination(q, 50);
  items = filtered.slice(pg.skip, pg.skip + pg.limit).map((x) => ({ ...x.doc.toJSON(), stockStatus: x.status }));
  res.json({ success: true, ...paged(items, filtered.length, pg) });
}

// GET /api/inventory/alerts — for the dashboard / notification area
async function getAlerts(_req, res) {
  const items = await InventoryItem.find({ isActive: true });
  const now = new Date();
  const warnUntil = addDays(now, expiryWarningDays);

  const lowStock = [];
  const expiringSoon = [];
  const expired = [];

  for (const item of items) {
    if (item.availableQuantity <= item.reorderLevel) {
      lowStock.push({
        _id: item._id,
        name: item.name,
        unit: item.unit,
        availableQuantity: item.availableQuantity,
        reorderLevel: item.reorderLevel,
        outOfStock: item.availableQuantity === 0,
      });
    }
    for (const b of item.batches) {
      if (!b.expirationDate) continue;
      const entry = {
        itemId: item._id,
        name: item.name,
        unit: item.unit,
        batchId: b._id,
        lotNumber: b.lotNumber,
        quantity: b.quantity,
        expirationDate: b.expirationDate,
        daysLeft: Math.ceil((b.expirationDate - now) / 86400000),
      };
      if (b.expirationDate <= now) expired.push(entry);
      else if (b.expirationDate <= warnUntil) expiringSoon.push(entry);
    }
  }
  expiringSoon.sort((a, b) => a.expirationDate - b.expirationDate);

  res.json({
    success: true,
    expiryWarningDays,
    counts: { lowStock: lowStock.length, expiringSoon: expiringSoon.length, expired: expired.length },
    lowStock,
    expiringSoon,
    expired,
  });
}

// GET /api/inventory/:id
async function getItem(req, res) {
  const item = await findItemOr404(req.params.id);
  res.json({ success: true, data: { ...item.toJSON(), stockStatus: stockStatus(item) } });
}

// POST /api/inventory
async function createItem(req, res) {
  const { initialStock, ...fields } = req.body;
  const item = new InventoryItem(fields);
  if (initialStock) item.batches.push(initialStock);
  await item.save();

  if (initialStock) {
    await logMovement(item, req.user, {
      type: MOVEMENT_TYPES.RESTOCK,
      quantity: initialStock.quantity,
      lotNumber: initialStock.lotNumber,
      expirationDate: initialStock.expirationDate,
      reason: 'Initial stock',
    });
  }
  audit(req, 'inventory.create', 'InventoryItem', item._id, { name: item.name });
  res.status(201).json({ success: true, data: item });
}

// PATCH /api/inventory/:id
async function updateItem(req, res) {
  const item = await findItemOr404(req.params.id);
  Object.assign(item, req.body);
  await item.save();
  audit(req, 'inventory.update', 'InventoryItem', item._id, req.body);
  res.json({ success: true, data: item });
}

// DELETE /api/inventory/:id — soft delete (keeps history intact)
async function deactivateItem(req, res) {
  const item = await findItemOr404(req.params.id);
  item.isActive = false;
  await item.save();
  audit(req, 'inventory.deactivate', 'InventoryItem', item._id);
  res.json({ success: true, message: `${item.name} archived`, data: item });
}

// POST /api/inventory/:id/restock — receive a new batch
async function restock(req, res) {
  const item = await findItemOr404(req.params.id);
  const { reason, ...batch } = req.body;
  if (batch.expirationDate && batch.expirationDate <= new Date()) {
    throw ApiError.badRequest('This batch is already expired');
  }
  item.batches.push(batch);
  await item.save();
  await logMovement(item, req.user, {
    type: MOVEMENT_TYPES.RESTOCK,
    quantity: batch.quantity,
    lotNumber: batch.lotNumber,
    expirationDate: batch.expirationDate,
    reason: reason || (batch.supplier ? `Delivery from ${batch.supplier}` : 'Restock'),
  });
  audit(req, 'inventory.restock', 'InventoryItem', item._id, { quantity: batch.quantity, lotNumber: batch.lotNumber });
  res.status(201).json({ success: true, data: item });
}

// POST /api/inventory/:id/adjust { batchId, newQuantity, reason } — after a physical count
async function adjustStock(req, res) {
  const item = await findItemOr404(req.params.id);
  const batch = item.batches.id(req.body.batchId);
  if (!batch) throw ApiError.notFound('Batch not found on this item');

  const diff = req.body.newQuantity - batch.quantity;
  if (diff === 0) throw ApiError.badRequest('New quantity is the same as the current quantity');
  const { lotNumber, expirationDate } = batch;
  batch.quantity = req.body.newQuantity;
  await item.save();

  await logMovement(item, req.user, {
    type: MOVEMENT_TYPES.ADJUST,
    quantity: diff,
    lotNumber,
    expirationDate,
    reason: req.body.reason,
  });
  audit(req, 'inventory.adjust', 'InventoryItem', item._id, { lotNumber, diff, reason: req.body.reason });
  res.json({ success: true, data: item });
}

// POST /api/inventory/:id/dispose-expired — remove all expired batches of this item
async function disposeExpired(req, res) {
  const item = await findItemOr404(req.params.id);
  const now = new Date();
  const expiredBatches = item.batches.filter((b) => b.expirationDate && b.expirationDate <= now);
  if (!expiredBatches.length) throw ApiError.badRequest('This item has no expired batches');

  const removed = expiredBatches.map((b) => ({ lotNumber: b.lotNumber, expirationDate: b.expirationDate, quantity: b.quantity }));
  expiredBatches.forEach((b) => { b.quantity = 0; });
  await item.save();

  for (const r of removed) {
    await logMovement(item, req.user, {
      type: MOVEMENT_TYPES.DISPOSE,
      quantity: -r.quantity,
      lotNumber: r.lotNumber,
      expirationDate: r.expirationDate,
      reason: 'Expired stock disposed',
    });
  }
  audit(req, 'inventory.dispose', 'InventoryItem', item._id, { removed });
  res.json({ success: true, removed, data: item });
}

// GET /api/inventory/:id/movements  and  GET /api/inventory/movements (all items)
async function listMovements(req, res) {
  const pg = getPagination(req.query, 50);
  const filter = {};
  if (req.params.id) filter.item = req.params.id;
  if (req.query.type) filter.type = req.query.type;

  const [items, total] = await Promise.all([
    StockMovement.find(filter)
      .sort({ createdAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .populate('performedBy', 'fullName')
      .populate('visit', 'queueNumber studentNumber'),
    StockMovement.countDocuments(filter),
  ]);
  res.json({ success: true, ...paged(items, total, pg) });
}

module.exports = {
  listItems,
  getAlerts,
  getItem,
  createItem,
  updateItem,
  deactivateItem,
  restock,
  adjustStock,
  disposeExpired,
  listMovements,
};
