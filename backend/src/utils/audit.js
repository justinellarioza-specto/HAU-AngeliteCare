const AuditLog = require('../models/AuditLog');

// Fire-and-forget audit entry. Never blocks or breaks the request if logging fails.
function audit(req, action, entity, entityId, details) {
  AuditLog.create({
    user: req.user?._id,
    username: req.user?.username,
    action,
    entity,
    entityId: entityId ? String(entityId) : undefined,
    details,
    ip: req.ip,
  }).catch((err) => console.error('Audit log failed:', err.message));
}

module.exports = audit;
