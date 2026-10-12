const mongoose = require('mongoose');
const { ITEM_CATEGORIES } = require('../utils/constants');

// Stock is tracked per batch (lot) so each batch keeps its own expiration date.
// Dispensing uses FEFO — First Expiry, First Out — and skips expired batches.
const batchSchema = new mongoose.Schema(
  {
    lotNumber: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    expirationDate: Date, // optional for supplies/equipment that don't expire
    receivedAt: { type: Date, default: Date.now },
    supplier: { type: String, trim: true },
  },
  { timestamps: false }
);

const inventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },      // "Paracetamol 500 mg"
    genericName: { type: String, trim: true },               // "Paracetamol"
    brandName: { type: String, trim: true },                 // "Biogesic"
    category: { type: String, enum: Object.values(ITEM_CATEGORIES), required: true },
    dosageForm: { type: String, trim: true },                // tablet, capsule, syrup, cream…
    strength: { type: String, trim: true },                  // "500 mg"
    unit: { type: String, required: true, trim: true, default: 'pc' }, // tablet, pc, bottle, box
    description: { type: String, trim: true },
    reorderLevel: { type: Number, min: 0, default: 10 },
    // When true, students can pick this item at the kiosk when requesting medicine/supplies
    isRequestable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    batches: [batchSchema],
    totalQuantity: { type: Number, default: 0, min: 0 }, // kept in sync from batches
  },
  {
    timestamps: true,
    optimisticConcurrency: true, // prevents two staff from dispensing the same stock at once
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

inventoryItemSchema.pre('validate', function syncTotals() {
  this.batches = this.batches.filter((b) => b.quantity > 0);
  this.totalQuantity = this.batches.reduce((sum, b) => sum + b.quantity, 0);
});

inventoryItemSchema.methods.isBatchExpired = function isBatchExpired(batch, now = new Date()) {
  return Boolean(batch.expirationDate && batch.expirationDate <= now);
};

// Stock that can actually be dispensed (excludes expired batches)
inventoryItemSchema.virtual('availableQuantity').get(function availableQuantity() {
  const now = new Date();
  return (this.batches || [])
    .filter((b) => !this.isBatchExpired(b, now))
    .reduce((sum, b) => sum + b.quantity, 0);
});

inventoryItemSchema.virtual('expiredQuantity').get(function expiredQuantity() {
  return (this.totalQuantity || 0) - this.availableQuantity;
});

inventoryItemSchema.virtual('nearestExpiration').get(function nearestExpiration() {
  const now = new Date();
  const dates = (this.batches || [])
    .filter((b) => b.expirationDate && !this.isBatchExpired(b, now))
    .map((b) => b.expirationDate)
    .sort((a, b) => a - b);
  return dates[0] || null;
});

inventoryItemSchema.virtual('isLowStock').get(function isLowStock() {
  return this.availableQuantity <= this.reorderLevel;
});

/**
 * Plan a FEFO deduction without saving. Returns the batches to take from.
 * Throws if there isn't enough non-expired stock.
 */
inventoryItemSchema.methods.planDeduction = function planDeduction(quantity) {
  const now = new Date();
  const usable = this.batches
    .filter((b) => b.quantity > 0 && !this.isBatchExpired(b, now))
    .sort((a, b) => {
      if (!a.expirationDate) return 1; // non-expiring last
      if (!b.expirationDate) return -1;
      return a.expirationDate - b.expirationDate;
    });

  let remaining = quantity;
  const plan = [];
  for (const batch of usable) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    plan.push({ batchId: batch._id, lotNumber: batch.lotNumber, expirationDate: batch.expirationDate, quantity: take });
    remaining -= take;
  }
  return { plan, shortBy: remaining > 0 ? remaining : 0 };
};

inventoryItemSchema.methods.applyDeduction = function applyDeduction(plan) {
  for (const p of plan) {
    const batch = this.batches.id(p.batchId);
    batch.quantity -= p.quantity;
  }
};

inventoryItemSchema.index({ name: 1 });
inventoryItemSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
