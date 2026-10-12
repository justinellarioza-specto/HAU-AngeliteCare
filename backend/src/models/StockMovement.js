const mongoose = require('mongoose');
const { MOVEMENT_TYPES } = require('../utils/constants');

const { ObjectId } = mongoose.Schema.Types;

// Digital version of the manual inventory ledger: every stock change is logged here.
const stockMovementSchema = new mongoose.Schema(
  {
    item: { type: ObjectId, ref: 'InventoryItem', required: true },
    itemName: String,
    type: { type: String, enum: Object.values(MOVEMENT_TYPES), required: true },
    quantity: { type: Number, required: true }, // positive = in, negative = out
    lotNumber: String,
    expirationDate: Date,
    balanceAfter: Number,
    reason: { type: String, trim: true },
    visit: { type: ObjectId, ref: 'Visit' },
    performedBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockMovementSchema.index({ item: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
