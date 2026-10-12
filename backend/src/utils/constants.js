// Central list of enums so the frontend and backend agree on the same values.

const ROLES = Object.freeze({
  ADMIN: 'admin', // clinic head / system admin: manages staff accounts, sees audit logs
  NURSE: 'nurse', // clinic staff: handles queue, records, inventory
});

const REQUEST_TYPES = Object.freeze({
  CHECKUP: 'checkup',             // consultation / physical check-up
  MEDICINE: 'medicine',           // medicine request
  MEDICAL_SUPPLY: 'medical_supply', // health-related tools / supplies (bandage, ice pack, crutches, etc.)
  CERTIFICATE: 'certificate',     // medical clearance / certificate
  OTHER: 'other',
});

const REQUEST_TYPE_LABELS = Object.freeze({
  checkup: 'Consultation / Check-up',
  medicine: 'Medicine Request',
  medical_supply: 'Medical Supply / Equipment Request',
  certificate: 'Medical Clearance / Certificate',
  other: 'Other Concern',
});

// Prefix used for the daily queue number (e.g. C-004, M-012)
const QUEUE_PREFIX = Object.freeze({
  checkup: 'C',
  medicine: 'M',
  medical_supply: 'S',
  certificate: 'R',
  other: 'O',
});

const VISIT_STATUS = Object.freeze({
  WAITING: 'waiting',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
});

const ACTIVE_STATUSES = [VISIT_STATUS.WAITING, VISIT_STATUS.IN_PROGRESS];

const ITEM_CATEGORIES = Object.freeze({
  MEDICINE: 'medicine',
  SUPPLY: 'supply',
  EQUIPMENT: 'equipment',
});

const MOVEMENT_TYPES = Object.freeze({
  RESTOCK: 'restock',     // new batch received
  DISPENSE: 'dispense',   // given to a patient during a visit
  ADJUST: 'adjust',       // manual correction after a physical count
  DISPOSE: 'dispose',     // expired / damaged stock removed
});

const SOURCES = Object.freeze({
  KIOSK: 'kiosk',   // student typed their student number
  WALK_IN: 'walk_in', // staff encoded it for the student
});

module.exports = {
  ROLES,
  REQUEST_TYPES,
  REQUEST_TYPE_LABELS,
  QUEUE_PREFIX,
  VISIT_STATUS,
  ACTIVE_STATUSES,
  ITEM_CATEGORIES,
  MOVEMENT_TYPES,
  SOURCES,
};
