const mongoose = require('mongoose');
const { REQUEST_TYPES, VISIT_STATUS, SOURCES } = require('../utils/constants');

const { ObjectId } = mongoose.Schema.Types;

// A Visit is BOTH the queue ticket and the consultation record.
// waiting -> in_progress -> completed   (or cancelled / no_show)
// Completed visits make up the patient's medical history.

const requestedItemSchema = new mongoose.Schema(
  {
    item: { type: ObjectId, ref: 'InventoryItem' },
    name: { type: String, trim: true }, // free text allowed if the item isn't in inventory
    quantity: { type: Number, min: 1, default: 1 },
  },
  { _id: false }
);

const dispensedItemSchema = new mongoose.Schema(
  {
    item: { type: ObjectId, ref: 'InventoryItem', required: true },
    name: String,
    unit: String,
    quantity: { type: Number, required: true, min: 1 },
    batches: [{ _id: false, lotNumber: String, expirationDate: Date, quantity: Number }],
    instructions: { type: String, trim: true }, // e.g. "1 tab every 4 hrs as needed for fever"
  },
  { _id: false }
);

const vitalsSchema = new mongoose.Schema(
  {
    bloodPressure: { type: String, trim: true },  // "120/80"
    temperature: { type: Number, min: 30, max: 45 }, // °C
    pulseRate: { type: Number, min: 20, max: 250 },  // bpm
    respiratoryRate: { type: Number, min: 5, max: 80 }, // breaths/min
    oxygenSaturation: { type: Number, min: 50, max: 100 }, // SpO2 %
    weight: { type: Number, min: 1, max: 400 }, // kg
    height: { type: Number, min: 30, max: 250 }, // cm
    painScale: { type: Number, min: 0, max: 10 },
  },
  { _id: false }
);

const visitSchema = new mongoose.Schema(
  {
    patient: { type: ObjectId, ref: 'Patient', required: true },
    studentNumber: { type: String, required: true, uppercase: true, trim: true },

    // Queue info
    queueNumber: { type: String, required: true }, // e.g. "C-004"
    queueDate: { type: String, required: true },   // clinic-local "YYYY-MM-DD"
    priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    source: { type: String, enum: Object.values(SOURCES), default: SOURCES.KIOSK },

    // What the student asked for
    requestType: { type: String, enum: Object.values(REQUEST_TYPES), required: true },
    reason: { type: String, trim: true, maxlength: 1000 }, // chief complaint / reason for visit
    requestedItems: [requestedItemSchema],

    status: { type: String, enum: Object.values(VISIT_STATUS), default: VISIT_STATUS.WAITING },

    // Clinical record (filled in by staff)
    vitals: vitalsSchema,
    assessment: { type: String, trim: true }, // findings / impression
    treatment: { type: String, trim: true },  // intervention / management done
    dispensed: [dispensedItemSchema],
    referral: { type: String, trim: true },   // e.g. "Referred to HAU partner hospital ER"
    remarks: { type: String, trim: true },
    followUpDate: Date,
    cancelReason: { type: String, trim: true },

    handledBy: { type: ObjectId, ref: 'User' },
    createdBy: { type: ObjectId, ref: 'User' }, // set when staff encodes a walk-in
    calledAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

visitSchema.index({ queueDate: 1, status: 1, createdAt: 1 });
visitSchema.index({ patient: 1, createdAt: -1 });
visitSchema.index({ studentNumber: 1, createdAt: -1 });

module.exports = mongoose.model('Visit', visitSchema);
