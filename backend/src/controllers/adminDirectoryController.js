const { query } = require('../config/db');
const { recordAdminAction } = require('../services/adminAuditService');

const CUSTOM_BASE_ROLES = ['student', 'lecturer'];
const ALL_BASE_ROLES = ['student', 'lecturer', 'institution_admin', 'admin'];
const HEX_COLOR = /^#[0-9A-F]{6}$/i;
const isSystemAdministrator = (user) => user.role === 'admin';

function numericId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function roleKeyFromName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function scopeFor(req, res) {
  if (isSystemAdministrator(req.user)) return null;
  const scope = numericId(req.user.institution_id);
  if (!scope) {
    res.status(403).json({ message: 'Institution administrators must belong to an institution.' });
    return undefined;
  }
  return scope;
}

function databaseMessage(error, fallback) {
  if (error.code === '23505') return 'A record with that name already exists in this scope.';
  if (error.code === '23503') return 'This record is still referenced by another system record.';
  return fallback;
}

async function getInstitutions(req, res) {
  const scope = scopeFor(req, res);
  if (scope === undefined) return;
  try {
    const result = await query(
      `SELECT i.id, i.name, i.type, i.location, i.created_at,
              COUNT(DISTINCT d.id)::int AS department_count,
              COUNT(DISTINCT u.id)::int AS user_count
       FROM institutions i
       LEFT JOIN departments d ON d.institution_id = i.id
       LEFT JOIN users u ON u.institution_id = i.id
       WHERE $1::int IS NULL OR i.id = $1
       GROUP BY i.id
       ORDER BY i.name ASC`,
      [scope],
    );
    return res.status(200).json({ institutions: result.rows });
  } catch (error) {
    console.error('Admin institution list error:', error);
    return res.status(500).json({ message: 'Unable to load institutions.' });
  }
}

async function createInstitution(req, res) {
  const name = clean(req.body.name);
  const type = clean(req.body.type);
  const location = clean(req.body.location);
  if (!name || !type || !location) return res.status(400).json({ message: 'Name, type, and location are required.' });
  try {
    const result = await query(
      `INSERT INTO institutions (name, type, location) VALUES ($1, $2, $3)
       RETURNING *, 0::int AS department_count, 0::int AS user_count`,
      [name, type, location],
    );
    const institution = result.rows[0];
    await recordAdminAction(req.user.id, 'created', 'institution', institution.id, `Created institution “${institution.name}”.`, institution.id);
    return res.status(201).json({ message: 'Institution created.', institution });
  } catch (error) {
    console.error('Admin institution create error:', error);
    return res.status(error.code === '23505' ? 409 : 500).json({ message: databaseMessage(error, 'Unable to create institution.') });
  }
}

async function updateInstitution(req, res) {
  const id = numericId(req.params.id);
  const name = clean(req.body.name);
  const type = clean(req.body.type);
  const location = clean(req.body.location);
  if (!id) return res.status(400).json({ message: 'Invalid institution ID.' });
  if (!name || !type || !location) return res.status(400).json({ message: 'Name, type, and location are required.' });
  try {
    const result = await query('UPDATE institutions SET name = $1, type = $2, location = $3 WHERE id = $4 RETURNING *', [name, type, location, id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Institution not found.' });
    await recordAdminAction(req.user.id, 'updated', 'institution', id, `Updated institution “${name}”.`, id);
    return res.status(200).json({ message: 'Institution updated.', institution: result.rows[0] });
  } catch (error) {
    console.error('Admin institution update error:', error);
    return res.status(error.code === '23505' ? 409 : 500).json({ message: databaseMessage(error, 'Unable to update institution.') });
  }
}

async function deleteInstitution(req, res) {
  const id = numericId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid institution ID.' });
  try {
    const result = await query('DELETE FROM institutions WHERE id = $1 RETURNING name', [id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Institution not found.' });
    await recordAdminAction(req.user.id, 'deleted', 'institution', id, `Deleted institution “${result.rows[0].name}” and its departments.`);
    return res.status(200).json({ message: 'Institution and its departments deleted.' });
  } catch (error) {
    console.error('Admin institution delete error:', error);
    return res.status(500).json({ message: databaseMessage(error, 'Unable to delete institution.') });
  }
}

async function getDepartments(req, res) {
  const scope = scopeFor(req, res);
  if (scope === undefined) return;
  try {
    const result = await query(
      `SELECT d.id, d.name, d.institution_id, d.created_at, i.name AS institution_name,
              COUNT(u.id)::int AS user_count
       FROM departments d
       JOIN institutions i ON i.id = d.institution_id
       LEFT JOIN users u ON u.department_id = d.id
       WHERE $1::int IS NULL OR d.institution_id = $1
       GROUP BY d.id, i.name
       ORDER BY i.name ASC, d.name ASC`,
      [scope],
    );
    return res.status(200).json({ departments: result.rows });
  } catch (error) {
    console.error('Admin department list error:', error);
    return res.status(500).json({ message: 'Unable to load departments.' });
  }
}

async function createDepartment(req, res) {
  const scope = scopeFor(req, res);
  if (scope === undefined) return;
  const name = clean(req.body.name);
  const requestedInstitution = numericId(req.body.institutionId);
  const institutionId = scope || requestedInstitution;
  if (!name || !institutionId) return res.status(400).json({ message: 'Department name and institution are required.' });
  try {
    const result = await query('INSERT INTO departments (name, institution_id) VALUES ($1, $2) RETURNING *', [name, institutionId]);
    const department = result.rows[0];
    await recordAdminAction(req.user.id, 'created', 'department', department.id, `Created department “${name}”.`, institutionId);
    return res.status(201).json({ message: 'Department created.', department });
  } catch (error) {
    console.error('Admin department create error:', error);
    const status = error.code === '23505' ? 409 : error.code === '23503' ? 400 : 500;
    return res.status(status).json({ message: databaseMessage(error, 'Unable to create department.') });
  }
}

async function updateDepartment(req, res) {
  const scope = scopeFor(req, res);
  if (scope === undefined) return;
  const id = numericId(req.params.id);
  const name = clean(req.body.name);
  const requestedInstitution = numericId(req.body.institutionId);
  const institutionId = scope || requestedInstitution;
  if (!id) return res.status(400).json({ message: 'Invalid department ID.' });
  if (!name || !institutionId) return res.status(400).json({ message: 'Department name and institution are required.' });
  try {
    const current = await query(
      `SELECT d.institution_id, COUNT(u.id)::int AS user_count
       FROM departments d LEFT JOIN users u ON u.department_id = d.id
       WHERE d.id = $1 AND ($2::int IS NULL OR d.institution_id = $2)
       GROUP BY d.id`,
      [id, scope],
    );
    if (!current.rowCount) return res.status(404).json({ message: 'Department not found in your administrative scope.' });
    if (current.rows[0].user_count > 0 && Number(current.rows[0].institution_id) !== institutionId) {
      return res.status(409).json({ message: 'Move or reassign the department’s users before changing its institution.' });
    }
    const result = await query('UPDATE departments SET name = $1, institution_id = $2 WHERE id = $3 RETURNING *', [name, institutionId, id]);
    await recordAdminAction(req.user.id, 'updated', 'department', id, `Updated department “${name}”.`, institutionId);
    return res.status(200).json({ message: 'Department updated.', department: result.rows[0] });
  } catch (error) {
    console.error('Admin department update error:', error);
    const status = error.code === '23505' ? 409 : error.code === '23503' ? 400 : 500;
    return res.status(status).json({ message: databaseMessage(error, 'Unable to update department.') });
  }
}

async function deleteDepartment(req, res) {
  const scope = scopeFor(req, res);
  if (scope === undefined) return;
  const id = numericId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid department ID.' });
  try {
    const result = await query(
      `DELETE FROM departments WHERE id = $1 AND ($2::int IS NULL OR institution_id = $2)
       RETURNING name, institution_id`,
      [id, scope],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Department not found in your administrative scope.' });
    await recordAdminAction(req.user.id, 'deleted', 'department', id, `Deleted department “${result.rows[0].name}”.`, result.rows[0].institution_id);
    return res.status(200).json({ message: 'Department deleted.' });
  } catch (error) {
    console.error('Admin department delete error:', error);
    return res.status(500).json({ message: databaseMessage(error, 'Unable to delete department.') });
  }
}

async function getRoles(req, res) {
  const scope = scopeFor(req, res);
  if (scope === undefined) return;
  try {
    const result = await query(
      `SELECT r.id, r.name, r.role_key, r.description, r.base_role, r.color,
              r.is_system, r.institution_id, r.created_at, i.name AS institution_name,
              COUNT(u.id)::int AS user_count,
              CASE WHEN $1::int IS NULL THEN TRUE
                   ELSE (r.base_role IN ('student', 'lecturer') AND (r.institution_id IS NULL OR r.institution_id = $1)) END AS can_assign,
              CASE WHEN $1::int IS NULL THEN TRUE
                   ELSE (NOT r.is_system AND r.institution_id = $1) END AS can_manage
       FROM user_roles r
       LEFT JOIN institutions i ON i.id = r.institution_id
       LEFT JOIN users u ON u.role_id = r.id AND ($1::int IS NULL OR u.institution_id = $1)
       WHERE $1::int IS NULL OR r.institution_id IS NULL OR r.institution_id = $1
       GROUP BY r.id, i.name
       ORDER BY r.is_system DESC, r.institution_id NULLS FIRST, r.name ASC`,
      [scope],
    );
    return res.status(200).json({ roles: result.rows });
  } catch (error) {
    console.error('Admin role list error:', error);
    return res.status(500).json({ message: 'Unable to load user roles.' });
  }
}

async function createRole(req, res) {
  const scope = scopeFor(req, res);
  if (scope === undefined) return;
  const name = clean(req.body.name);
  const description = clean(req.body.description);
  const baseRole = clean(req.body.baseRole).toLowerCase();
  const color = clean(req.body.color).toUpperCase() || '#2563EB';
  const institutionId = scope || numericId(req.body.institutionId);
  const roleKey = roleKeyFromName(name);
  if (!name || !roleKey || !CUSTOM_BASE_ROLES.includes(baseRole)) return res.status(400).json({ message: 'Custom roles must inherit Student or Lecturer access.' });
  if (!HEX_COLOR.test(color)) return res.status(400).json({ message: 'Role color must be a valid hex color.' });
  try {
    const result = await query(
      `INSERT INTO user_roles (name, role_key, description, base_role, color, institution_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *, 0::int AS user_count`,
      [name, roleKey, description, baseRole, color, institutionId],
    );
    const role = result.rows[0];
    await recordAdminAction(req.user.id, 'created', 'user_role', role.id, `Created role “${name}” with ${baseRole} access.`, institutionId);
    return res.status(201).json({ message: 'Role created.', role });
  } catch (error) {
    console.error('Admin role create error:', error);
    const status = error.code === '23505' ? 409 : error.code === '23503' ? 400 : 500;
    return res.status(status).json({ message: databaseMessage(error, 'Unable to create role.') });
  }
}

async function updateRole(req, res) {
  const scope = scopeFor(req, res);
  if (scope === undefined) return;
  const id = numericId(req.params.id);
  const name = clean(req.body.name);
  const description = clean(req.body.description);
  const baseRole = clean(req.body.baseRole).toLowerCase();
  const color = clean(req.body.color).toUpperCase() || '#2563EB';
  if (!id || !name || !ALL_BASE_ROLES.includes(baseRole)) return res.status(400).json({ message: 'Name and a valid access level are required.' });
  if (!HEX_COLOR.test(color)) return res.status(400).json({ message: 'Role color must be a valid hex color.' });
  try {
    const existing = await query(
      `SELECT r.is_system, r.base_role, r.institution_id, COUNT(u.id)::int AS user_count
       FROM user_roles r LEFT JOIN users u ON u.role_id = r.id
       WHERE r.id = $1 GROUP BY r.id`,
      [id],
    );
    if (!existing.rowCount) return res.status(404).json({ message: 'Role not found.' });
    const current = existing.rows[0];
    if (scope && (current.is_system || Number(current.institution_id) !== scope)) return res.status(403).json({ message: 'You can edit only custom roles from your institution.' });
    if (!current.is_system && !CUSTOM_BASE_ROLES.includes(baseRole)) return res.status(400).json({ message: 'Custom roles must inherit Student or Lecturer access.' });
    if (current.is_system && current.base_role !== baseRole) return res.status(400).json({ message: 'The access level of a system role cannot be changed.' });
    if (current.user_count > 0 && current.base_role !== baseRole) return res.status(409).json({ message: 'Reassign this role’s users before changing its access level.' });

    const result = await query(
      `UPDATE user_roles SET name = $1, description = $2, base_role = $3, color = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [name, description, baseRole, color, id],
    );
    await recordAdminAction(req.user.id, 'updated', 'user_role', id, `Updated role “${name}”.`, current.institution_id);
    return res.status(200).json({ message: 'Role updated.', role: result.rows[0] });
  } catch (error) {
    console.error('Admin role update error:', error);
    return res.status(error.code === '23505' ? 409 : 500).json({ message: databaseMessage(error, 'Unable to update role.') });
  }
}

async function deleteRole(req, res) {
  const scope = scopeFor(req, res);
  if (scope === undefined) return;
  const id = numericId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid role ID.' });
  try {
    const result = await query(
      `SELECT r.name, r.is_system, r.institution_id, COUNT(u.id)::int AS user_count
       FROM user_roles r LEFT JOIN users u ON u.role_id = r.id
       WHERE r.id = $1 GROUP BY r.id`,
      [id],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Role not found.' });
    const role = result.rows[0];
    if (role.is_system) return res.status(400).json({ message: 'System roles cannot be deleted.' });
    if (scope && Number(role.institution_id) !== scope) return res.status(403).json({ message: 'You can delete only roles from your institution.' });
    if (role.user_count > 0) return res.status(409).json({ message: 'Reassign users before deleting this role.' });
    await query('DELETE FROM user_roles WHERE id = $1', [id]);
    await recordAdminAction(req.user.id, 'deleted', 'user_role', id, `Deleted role “${role.name}”.`, role.institution_id);
    return res.status(200).json({ message: 'Role deleted.' });
  } catch (error) {
    console.error('Admin role delete error:', error);
    return res.status(500).json({ message: 'Unable to delete role.' });
  }
}

async function getAuditLogs(req, res) {
  const scope = scopeFor(req, res);
  if (scope === undefined) return;
  try {
    const result = await query(
      `SELECT l.id, l.action, l.entity_type, l.entity_id, l.summary,
              COALESCE(l.institution_id, CASE WHEN u.role = 'institution_admin' THEN u.institution_id END) AS institution_id,
              l.created_at,
              COALESCE(u.full_name, 'Former administrator') AS actor_name
       FROM admin_audit_logs l
       LEFT JOIN users u ON u.id = l.actor_id
       WHERE $1::int IS NULL
          OR l.institution_id = $1
          OR (l.institution_id IS NULL AND u.role = 'institution_admin' AND u.institution_id = $1)
       ORDER BY l.created_at DESC LIMIT 60`,
      [scope],
    );
    return res.status(200).json({ logs: result.rows });
  } catch (error) {
    console.error('Admin audit list error:', error);
    return res.status(500).json({ message: 'Unable to load administrative activity.' });
  }
}

module.exports = {
  getInstitutions,
  createInstitution,
  updateInstitution,
  deleteInstitution,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getAuditLogs,
};
