const { query } = require('../config/db');
const { recordAdminAction } = require('../services/adminAuditService');
const bcrypt = require('bcryptjs');

const isSystemAdministrator = (user) => user.role === 'admin';

function institutionScope(req, res) {
  if (isSystemAdministrator(req.user)) return null;
  const institutionId = Number(req.user.institution_id);
  if (!Number.isInteger(institutionId) || institutionId <= 0) {
    res.status(403).json({ message: 'Institution administrators must belong to an institution.' });
    return undefined;
  }
  return institutionId;
}

function validId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getRoleForAssignment(roleId, institutionId, scope) {
  const result = await query(
    'SELECT id, name, base_role, institution_id FROM user_roles WHERE id = $1',
    [roleId],
  );
  if (!result.rowCount) return { error: 'A valid role is required.', status: 400 };
  const role = result.rows[0];
  if (role.institution_id && Number(role.institution_id) !== Number(institutionId)) {
    return { error: 'That role belongs to a different institution.', status: 403 };
  }
  if (scope && !['student', 'lecturer'].includes(role.base_role)) {
    return { error: 'Only a system administrator can assign administrator roles.', status: 403 };
  }
  if (role.base_role === 'institution_admin' && !institutionId) {
    return { error: 'An institution administrator must belong to an institution.', status: 400 };
  }
  return { role };
}

async function departmentMatchesInstitution(departmentId, institutionId) {
  if (!departmentId) return true;
  const result = await query('SELECT id FROM departments WHERE id = $1 AND institution_id = $2', [departmentId, institutionId]);
  return result.rowCount > 0;
}

async function getAdminStats(req, res) {
  const scope = institutionScope(req, res);
  if (scope === undefined) return;
  try {
    const userStats = await query(
      `SELECT
         COUNT(*)::int AS total_users,
         COUNT(*) FILTER (WHERE role = 'student')::int AS students,
         COUNT(*) FILTER (WHERE role = 'lecturer')::int AS lecturers,
         COUNT(*) FILTER (WHERE role = 'institution_admin')::int AS institution_administrators,
         COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended
       FROM users
       WHERE $1::int IS NULL OR institution_id = $1`,
      [scope],
    );

    const entityStats = await query(
      `SELECT
         (SELECT COUNT(*) FROM institutions WHERE $1::int IS NULL OR id = $1)::int AS total_institutions,
         (SELECT COUNT(*) FROM departments WHERE $1::int IS NULL OR institution_id = $1)::int AS total_departments,
         (SELECT COUNT(*) FROM user_roles WHERE $1::int IS NULL OR institution_id IS NULL OR institution_id = $1)::int AS total_roles,
         (SELECT COUNT(*) FROM academic_communities WHERE $1::int IS NULL OR institution_id = $1)::int AS total_communities,
         (SELECT COUNT(*) FROM projects WHERE $1::int IS NULL OR institution_id = $1)::int AS total_projects,
         (SELECT COUNT(*) FROM events WHERE $1::int IS NULL OR institution_id = $1)::int AS total_events,
         CASE WHEN $1::int IS NULL THEN (SELECT COUNT(*) FROM news)::int ELSE 0 END AS total_news`,
      [scope],
    );

    return res.status(200).json({ users: userStats.rows[0], entities: entityStats.rows[0], scope: scope ? 'institution' : 'system' });
  } catch (error) {
    console.error('Fetch admin stats error:', error);
    return res.status(500).json({ message: 'Internal server error fetching admin statistics.' });
  }
}

async function getAllUsersDetailed(req, res) {
  const scope = institutionScope(req, res);
  if (scope === undefined) return;
  try {
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.role_id, u.status, u.created_at, u.student_id,
              u.institution_id, u.department_id,
              i.name AS institution_name, d.name AS department_name,
              COALESCE(r.name, INITCAP(REPLACE(u.role, '_', ' '))) AS role_name,
              COALESCE(r.color, '#2563EB') AS role_color,
              u.bio
       FROM users u
       LEFT JOIN institutions i ON u.institution_id = i.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN user_roles r ON u.role_id = r.id
       WHERE $1::int IS NULL OR u.institution_id = $1
       ORDER BY u.created_at DESC`,
      [scope],
    );
    return res.status(200).json({ users: result.rows });
  } catch (error) {
    console.error('Fetch all users detailed error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

async function createUser(req, res) {
  const scope = institutionScope(req, res);
  if (scope === undefined) return;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const roleId = validId(req.body.roleId);
  const institutionId = scope || validId(req.body.institutionId);
  const departmentId = validId(req.body.departmentId);
  const studentId = typeof req.body.studentId === 'string' ? req.body.studentId.trim() : '';
  const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : '';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'A valid email address is required.' });
  if (!fullName) return res.status(400).json({ message: 'Full name is required.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
  if (!roleId) return res.status(400).json({ message: 'A valid role is required.' });

  try {
    const roleSelection = await getRoleForAssignment(roleId, institutionId, scope);
    if (roleSelection.error) return res.status(roleSelection.status).json({ message: roleSelection.error });
    if (roleSelection.role.base_role === 'student' && !/^\d{1,10}$/.test(studentId)) {
      return res.status(400).json({ message: 'Student ID is required and must contain no more than 10 digits.' });
    }
    if (!(await departmentMatchesInstitution(departmentId, institutionId))) {
      return res.status(400).json({ message: 'The selected department does not belong to the selected institution.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, role_id, institution_id, department_id, student_id, bio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, email, full_name, role, role_id, institution_id, department_id, student_id, bio, status, created_at`,
      [email, passwordHash, fullName, roleSelection.role.base_role, roleSelection.role.id, institutionId, departmentId, roleSelection.role.base_role === 'student' ? studentId : null, bio],
    );
    const user = result.rows[0];
    await recordAdminAction(req.user.id, 'created', 'user', user.id, `Created user account for ${fullName}.`, institutionId);
    return res.status(201).json({ message: 'User created successfully.', user });
  } catch (error) {
    console.error('Admin create user error:', error);
    if (error.code === '23505') return res.status(409).json({ message: 'A user with that email already exists.' });
    if (error.code === '23503') return res.status(400).json({ message: 'The selected institution or department does not exist.' });
    return res.status(500).json({ message: 'Unable to create user.' });
  }
}

async function updateUser(req, res) {
  const scope = institutionScope(req, res);
  if (scope === undefined) return;
  const targetUserId = validId(req.params.userId);
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
  const roleId = validId(req.body.roleId);
  const requestedInstitution = validId(req.body.institutionId);
  const requestedDepartment = validId(req.body.departmentId);
  const studentId = typeof req.body.studentId === 'string' ? req.body.studentId.trim() : '';
  const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : '';
  if (!targetUserId) return res.status(400).json({ message: 'A valid user ID is required.' });
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !fullName || !roleId) {
    return res.status(400).json({ message: 'Full name, valid email, and role are required.' });
  }

  try {
    const currentResult = await query('SELECT id, role, institution_id, department_id FROM users WHERE id = $1', [targetUserId]);
    if (!currentResult.rowCount) return res.status(404).json({ message: 'User not found.' });
    const current = currentResult.rows[0];
    if (scope && Number(current.institution_id) !== scope) return res.status(403).json({ message: 'You can manage only users from your institution.' });
    if (scope && ['admin', 'institution_admin'].includes(current.role)) return res.status(403).json({ message: 'Only a system administrator can edit administrator accounts.' });

    if (scope && (
      Number(requestedInstitution) !== Number(current.institution_id)
      || Number(requestedDepartment) !== Number(current.department_id)
    )) {
      return res.status(403).json({ message: 'Only a system administrator can change a user\'s institution or department.' });
    }

    const institutionId = scope ? current.institution_id : requestedInstitution;
    const departmentId = scope ? current.department_id : requestedDepartment;
    const roleSelection = await getRoleForAssignment(roleId, institutionId, scope);
    if (roleSelection.error) return res.status(roleSelection.status).json({ message: roleSelection.error });
    if (roleSelection.role.base_role === 'student' && !/^\d{1,10}$/.test(studentId)) {
      return res.status(400).json({ message: 'Student ID is required and must contain no more than 10 digits.' });
    }
    if (targetUserId === Number(req.user.id) && roleSelection.role.base_role !== 'admin') {
      return res.status(400).json({ message: 'You cannot remove your own system administrator access.' });
    }
    if (!(await departmentMatchesInstitution(departmentId, institutionId))) {
      return res.status(400).json({ message: 'The selected department does not belong to the selected institution.' });
    }

    const result = await query(
      `UPDATE users
       SET email = $1, full_name = $2, role = $3, role_id = $4, institution_id = $5, department_id = $6, student_id = $7, bio = $8
       WHERE id = $9
       RETURNING id, email, full_name, role, role_id, institution_id, department_id, student_id, bio, status, created_at`,
      [email, fullName, roleSelection.role.base_role, roleSelection.role.id, institutionId, departmentId, roleSelection.role.base_role === 'student' ? studentId : null, bio, targetUserId],
    );
    await recordAdminAction(req.user.id, 'updated', 'user', targetUserId, `Updated user account for ${fullName}.`, institutionId);
    return res.status(200).json({ message: 'User updated successfully.', user: result.rows[0] });
  } catch (error) {
    console.error('Admin update user error:', error);
    if (error.code === '23505') return res.status(409).json({ message: 'A user with that email already exists.' });
    if (error.code === '23503') return res.status(400).json({ message: 'The selected institution or department does not exist.' });
    return res.status(500).json({ message: 'Unable to update user.' });
  }
}

async function toggleUserStatus(req, res) {
  const scope = institutionScope(req, res);
  if (scope === undefined) return;
  const targetUserId = validId(req.params.userId);
  if (!targetUserId) return res.status(400).json({ message: 'A valid user ID is required.' });
  if (targetUserId === Number(req.user.id)) return res.status(400).json({ message: 'You cannot suspend your own administrator account.' });

  try {
    const selected = await query('SELECT status, role, full_name, institution_id FROM users WHERE id = $1', [targetUserId]);
    if (!selected.rowCount) return res.status(404).json({ message: 'User not found.' });
    const user = selected.rows[0];
    if (scope && Number(user.institution_id) !== scope) return res.status(403).json({ message: 'You can manage only users from your institution.' });
    if (user.role === 'admin') return res.status(403).json({ message: 'System administrator accounts cannot be suspended here.' });
    if (scope && user.role === 'institution_admin') return res.status(403).json({ message: 'Only a system administrator can suspend an institution administrator.' });

    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    await query('UPDATE users SET status = $1 WHERE id = $2', [nextStatus, targetUserId]);
    await recordAdminAction(
      req.user.id,
      nextStatus === 'suspended' ? 'suspended' : 'activated',
      'user',
      targetUserId,
      `${nextStatus === 'suspended' ? 'Suspended' : 'Activated'} ${user.full_name}.`,
      user.institution_id,
    );
    return res.status(200).json({ message: `User ${nextStatus === 'active' ? 'activated' : 'suspended'} successfully.`, status: nextStatus });
  } catch (error) {
    console.error('Toggle user status error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

async function changeUserRole(req, res) {
  const scope = institutionScope(req, res);
  if (scope === undefined) return;
  const targetUserId = validId(req.params.userId);
  const roleId = validId(req.body.roleId);
  if (!targetUserId || !roleId) return res.status(400).json({ message: 'A valid user and role are required.' });

  try {
    const targetResult = await query('SELECT id, role, full_name, institution_id, student_id FROM users WHERE id = $1', [targetUserId]);
    if (!targetResult.rowCount) return res.status(404).json({ message: 'User not found.' });
    const target = targetResult.rows[0];
    if (scope && Number(target.institution_id) !== scope) return res.status(403).json({ message: 'You can manage only users from your institution.' });
    if (targetUserId === Number(req.user.id)) return res.status(400).json({ message: 'You cannot change your own administrator role.' });

    const roleResult = await query(
      'SELECT id, name, base_role, institution_id FROM user_roles WHERE id = $1',
      [roleId],
    );
    if (!roleResult.rowCount) return res.status(400).json({ message: 'A valid role is required.' });
    const role = roleResult.rows[0];

    if (role.institution_id && Number(role.institution_id) !== Number(target.institution_id)) {
      return res.status(403).json({ message: 'That role belongs to a different institution.' });
    }
    if (scope && !['student', 'lecturer'].includes(role.base_role)) {
      return res.status(403).json({ message: 'Only a system administrator can assign administrator roles.' });
    }
    if (role.base_role === 'institution_admin' && !target.institution_id) {
      return res.status(400).json({ message: 'An institution administrator must belong to an institution.' });
    }
    if (role.base_role === 'student' && !/^\d{1,10}$/.test(target.student_id || '')) {
      return res.status(400).json({ message: 'Add a valid student ID in the user editor before assigning a student role.' });
    }

    await query(
      'UPDATE users SET role = $1, role_id = $2, student_id = CASE WHEN $1 = \'student\' THEN student_id ELSE NULL END WHERE id = $3',
      [role.base_role, role.id, targetUserId],
    );
    await recordAdminAction(req.user.id, 'role_changed', 'user', targetUserId, `Assigned “${role.name}” to ${target.full_name}.`, target.institution_id);
    return res.status(200).json({ message: 'User role updated successfully.', role: role.base_role, roleId: role.id, roleName: role.name });
  } catch (error) {
    console.error('Change user role error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

async function getModerationCommunities(req, res) {
  const scope = institutionScope(req, res);
  if (scope === undefined) return;
  try {
    const result = await query(
      `SELECT id, name, category, institution_id, created_at
       FROM academic_communities
       WHERE $1::int IS NULL OR institution_id = $1
       ORDER BY created_at DESC`,
      [scope],
    );
    return res.status(200).json({ communities: result.rows });
  } catch (error) {
    console.error('Admin community list error:', error);
    return res.status(500).json({ message: 'Unable to load communities for moderation.' });
  }
}

async function getModerationEvents(req, res) {
  const scope = institutionScope(req, res);
  if (scope === undefined) return;
  try {
    const result = await query(
      `SELECT id, title, event_date, location, institution_id, created_at
       FROM events
       WHERE $1::int IS NULL OR institution_id = $1
       ORDER BY event_date DESC`,
      [scope],
    );
    return res.status(200).json({ events: result.rows });
  } catch (error) {
    console.error('Admin event list error:', error);
    return res.status(500).json({ message: 'Unable to load events for moderation.' });
  }
}

async function adminDeleteCommunity(req, res) {
  const scope = institutionScope(req, res);
  if (scope === undefined) return;
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ message: 'A valid community ID is required.' });
  try {
    const result = await query(
      `DELETE FROM academic_communities
       WHERE id = $1 AND ($2::int IS NULL OR institution_id = $2)
       RETURNING name, institution_id`,
      [id, scope],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Community not found in your administrative scope.' });
    await recordAdminAction(req.user.id, 'deleted', 'community', id, `Deleted community “${result.rows[0].name}”.`, result.rows[0].institution_id);
    return res.status(200).json({ message: 'Community deleted successfully.' });
  } catch (error) {
    console.error('Admin delete community error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

async function adminDeleteEvent(req, res) {
  const scope = institutionScope(req, res);
  if (scope === undefined) return;
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ message: 'A valid event ID is required.' });
  try {
    const result = await query(
      `DELETE FROM events
       WHERE id = $1 AND ($2::int IS NULL OR institution_id = $2)
       RETURNING title, institution_id`,
      [id, scope],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Event not found in your administrative scope.' });
    await recordAdminAction(req.user.id, 'deleted', 'event', id, `Cancelled event “${result.rows[0].title}”.`, result.rows[0].institution_id);
    return res.status(200).json({ message: 'Event deleted successfully.' });
  } catch (error) {
    console.error('Admin delete event error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = {
  getAdminStats,
  getAllUsersDetailed,
  createUser,
  updateUser,
  toggleUserStatus,
  changeUserRole,
  getModerationCommunities,
  getModerationEvents,
  adminDeleteCommunity,
  adminDeleteEvent,
};
