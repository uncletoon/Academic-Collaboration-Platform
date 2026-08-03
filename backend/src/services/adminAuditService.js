const { query } = require('../config/db');

async function recordAdminAction(actorId, action, entityType, entityId, summary, institutionId = null) {
  try {
    await query(
      `INSERT INTO admin_audit_logs (actor_id, action, entity_type, entity_id, summary, institution_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorId, action, entityType, entityId == null ? null : String(entityId), summary, institutionId],
    );
  } catch (error) {
    // Auditing must never turn a completed administrative action into a false failure.
    console.error('Admin audit write error:', error);
  }
}

module.exports = { recordAdminAction };
