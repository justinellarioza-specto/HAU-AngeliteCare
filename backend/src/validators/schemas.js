const { z } = require('zod');
const mongoose = require('mongoose');
const { ROLES, REQUEST_TYPES, VISIT_STATUS, ITEM_CATEGORIES } = require('../utils/constants');

// ---------- shared pieces ----------
const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');
const trimmed = (max = 200) => z.string().trim().max(max);
// Optional text. Sending "" on an update clears the field.
const optionalText = (max = 1000) => z.string().trim().max(max).optional();
const dateInput = z.coerce.date();
const studentNumber = z
  .string()
  .trim()
  .min(4, 'Student number is too short')
  .max(20, 'Student number is too long')
  .regex(/^[A-Za-z0-9-]+$/, 'Student number may only contain letters, numbers and dashes')
  .transform((v) => v.toUpperCase());
const stringList = z.array(z.string().trim().min(1).max(200)).max(50);
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);

// ---------- auth & users ----------
const login = z.object({
  username: z.string().trim().toLowerCase().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const changePassword = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

const createUser = z.object({
  fullName: trimmed(120).min(2),
  username: z.string().trim().toLowerCase().min(3).max(40).regex(/^[a-z0-9._-]+$/, 'Use letters, numbers, dot, dash or underscore'),
  email: z.string().trim().email().optional(),
  password,
  role: z.enum(Object.values(ROLES)).default(ROLES.NURSE),
  position: optionalText(80),
});

const updateUser = z.object({
  fullName: trimmed(120).min(2).optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(Object.values(ROLES)).optional(),
  position: optionalText(80),
  isActive: z.boolean().optional(),
});

const resetPassword = z.object({ newPassword: password });

const updateMe = z.object({
  fullName: trimmed(120).min(2).optional(),
  email: z.string().trim().email().optional(),
  position: optionalText(80),
}).strict();

// ---------- patients ----------
const patientFields = {
  patientType: z.enum(['student', 'faculty', 'staff']).optional(),
  firstName: trimmed(60).min(1),
  middleName: optionalText(60),
  lastName: trimmed(60).min(1),
  sex: z.enum(['male', 'female']).optional(),
  birthDate: dateInput.optional(),
  department: optionalText(120),
  program: optionalText(80),
  yearLevel: z.coerce.number().int().min(1).max(6).optional(),
  section: optionalText(30),
  contactNumber: optionalText(30),
  email: z.string().trim().email().optional().or(z.literal('').transform(() => undefined)),
  address: optionalText(300),
  emergencyContact: z
    .object({
      name: optionalText(120),
      relationship: optionalText(60),
      contactNumber: optionalText(30),
    })
    .optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).optional(),
  allergies: stringList.optional(),
  medicalConditions: stringList.optional(),
  currentMedications: stringList.optional(),
  notes: optionalText(2000),
};

const createPatient = z.object({ studentNumber, ...patientFields });
const updatePatient = z
  .object({ ...patientFields, firstName: trimmed(60).min(1).optional(), lastName: trimmed(60).min(1).optional() })
  .strict();

// ---------- kiosk (student side, no login) ----------
const requestedItem = z.object({
  item: objectId.optional(),
  name: optionalText(120),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
}).refine((v) => v.item || v.name, 'Each requested item needs an inventory item id or a name');

const kioskLookup = z.object({ studentNumber });

const kioskRequest = z
  .object({
    studentNumber,
    requestType: z.enum(Object.values(REQUEST_TYPES)),
    reason: optionalText(1000),
    requestedItems: z.array(requestedItem).max(10).optional(),
    // Only needed the first time a student uses the clinic (no record yet)
    patient: z
      .object({
        firstName: trimmed(60).min(1),
        middleName: optionalText(60),
        lastName: trimmed(60).min(1),
        program: optionalText(80),
        yearLevel: z.coerce.number().int().min(1).max(6).optional(),
        section: optionalText(30),
        contactNumber: optionalText(30),
        sex: z.enum(['male', 'female']).optional(),
      })
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.requestType === 'checkup' || v.requestType === 'other') {
      if (!v.reason) ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Please describe your concern / symptoms' });
    }
    if ((v.requestType === 'medicine' || v.requestType === 'medical_supply') && !v.requestedItems?.length && !v.reason) {
      ctx.addIssue({ code: 'custom', path: ['requestedItems'], message: 'Select at least one item or describe what you need' });
    }
  });

const kioskCancel = z.object({ studentNumber });

// ---------- visits / consultations ----------
const vitals = z
  .object({
    bloodPressure: z.string().trim().regex(/^\d{2,3}\/\d{2,3}$/, 'Use the format 120/80').optional(),
    temperature: z.coerce.number().min(30).max(45).optional(),
    pulseRate: z.coerce.number().min(20).max(250).optional(),
    respiratoryRate: z.coerce.number().min(5).max(80).optional(),
    oxygenSaturation: z.coerce.number().min(50).max(100).optional(),
    weight: z.coerce.number().min(1).max(400).optional(),
    height: z.coerce.number().min(30).max(250).optional(),
    painScale: z.coerce.number().int().min(0).max(10).optional(),
  })
  .strict();

const clinicalFields = {
  vitals: vitals.optional(),
  assessment: optionalText(2000),
  treatment: optionalText(2000),
  referral: optionalText(500),
  remarks: optionalText(2000),
  followUpDate: dateInput.optional(),
};

const dispenseLine = z.object({
  item: objectId,
  quantity: z.coerce.number().int().min(1).max(1000),
  instructions: optionalText(300),
});

const createWalkIn = z.object({
  studentNumber,
  requestType: z.enum(Object.values(REQUEST_TYPES)),
  reason: optionalText(1000),
  requestedItems: z.array(requestedItem).max(10).optional(),
  priority: z.enum(['normal', 'urgent']).default('normal'),
  // true  = put into today's queue (status: waiting)
  // false = staff is attending to the student right now (status: in_progress)
  addToQueue: z.boolean().default(true),
});

const updateVisit = z.object({
  ...clinicalFields,
  reason: optionalText(1000),
  priority: z.enum(['normal', 'urgent']).optional(),
}).strict();

const completeVisit = z.object({
  ...clinicalFields,
  dispensed: z.array(dispenseLine).max(20).default([]),
}).strict();

const cancelVisit = z.object({ reason: optionalText(300) });

const listVisitsQuery = z.object({
  status: z.enum(Object.values(VISIT_STATUS)).optional(),
  requestType: z.enum(Object.values(REQUEST_TYPES)).optional(),
  studentNumber: z.string().trim().toUpperCase().optional(),
  search: z.string().trim().max(100).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const callNext = z.object({ requestType: z.enum(Object.values(REQUEST_TYPES)).optional() });

// ---------- inventory ----------
const batchInput = z.object({
  lotNumber: optionalText(60),
  quantity: z.coerce.number().int().min(1).max(100000),
  expirationDate: dateInput.optional(),
  supplier: optionalText(120),
  receivedAt: dateInput.optional(),
});

const createItem = z.object({
  name: trimmed(120).min(2),
  genericName: optionalText(120),
  brandName: optionalText(120),
  category: z.enum(Object.values(ITEM_CATEGORIES)),
  dosageForm: optionalText(40),
  strength: optionalText(40),
  unit: trimmed(30).min(1).default('pc'),
  description: optionalText(500),
  reorderLevel: z.coerce.number().int().min(0).default(10),
  isRequestable: z.boolean().default(true),
  initialStock: batchInput.optional(),
});

const updateItem = z.object({
  name: trimmed(120).min(2).optional(),
  genericName: optionalText(120),
  brandName: optionalText(120),
  category: z.enum(Object.values(ITEM_CATEGORIES)).optional(),
  dosageForm: optionalText(40),
  strength: optionalText(40),
  unit: trimmed(30).min(1).optional(),
  description: optionalText(500),
  reorderLevel: z.coerce.number().int().min(0).optional(),
  isRequestable: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).strict();

const restock = batchInput.extend({ reason: optionalText(300) });

const adjustStock = z.object({
  batchId: objectId,
  newQuantity: z.coerce.number().int().min(0),
  reason: trimmed(300).min(3, 'Reason is required for stock adjustments'),
});

const listItemsQuery = z.object({
  category: z.enum(Object.values(ITEM_CATEGORIES)).optional(),
  search: z.string().trim().max(100).optional(),
  stock: z.enum(['low', 'out', 'expiring', 'expired']).optional(),
  includeInactive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

module.exports = {
  login,
  changePassword,
  createUser,
  updateUser,
  resetPassword,
  updateMe,
  createPatient,
  updatePatient,
  kioskLookup,
  kioskRequest,
  kioskCancel,
  createWalkIn,
  updateVisit,
  completeVisit,
  cancelVisit,
  listVisitsQuery,
  callNext,
  createItem,
  updateItem,
  restock,
  adjustStock,
  listItemsQuery,
};
