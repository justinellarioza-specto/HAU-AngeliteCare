const mongoose = require('mongoose');

// Who accessed or changed health records, and when (RA 10173 / Data Privacy Act accountability).
const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    action: { type: String, required: true }, // e.g. "patient.view", "visit.complete", "auth.login"
    entity: String,                           // "Patient", "Visit", "InventoryItem", "User"
    entityId: String,
    details: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
