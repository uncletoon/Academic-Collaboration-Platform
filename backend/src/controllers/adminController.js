const { query } = require('../config/db');

// Get admin stats / dashboard reports
async function getAdminStats(req, res) {
  try {
    // Collect counts for users, communities, projects, events, news, etc.
    const userStats = await query(`
      SELECT 
        COUNT(*)::int as total_users,
        COUNT(CASE WHEN role = 'student' THEN 1 END)::int as students,
        COUNT(CASE WHEN role = 'lecturer' THEN 1 END)::int as lecturers,
        COUNT(CASE WHEN role = 'researcher' THEN 1 END)::int as researchers,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END)::int as suspended
      FROM users
    `);

    const entityStats = await query(`
      SELECT
        (SELECT COUNT(*) FROM institutions)::int as total_institutions,
        (SELECT COUNT(*) FROM academic_communities)::int as total_communities,
        (SELECT COUNT(*) FROM projects)::int as total_projects,
        (SELECT COUNT(*) FROM events)::int as total_events,
        (SELECT COUNT(*) FROM news)::int as total_news
    `);

    return res.status(200).json({
      users: userStats.rows[0],
      entities: entityStats.rows[0]
    });
  } catch (error) {
    console.error('Fetch admin stats error:', error);
    return res.status(500).json({ message: 'Internal server error fetching admin statistics.' });
  }
}

// Get all users (detailed list for administration)
async function getAllUsersDetailed(req, res) {
  try {
    const sql = `
      SELECT u.id, u.email, u.full_name, u.role, u.status, u.created_at,
             i.name as institution_name, d.name as department_name
      FROM users u
      LEFT JOIN institutions i ON u.institution_id = i.id
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.created_at DESC
    `;
    const result = await query(sql);
    return res.status(200).json({ users: result.rows });
  } catch (error) {
    console.error('Fetch all users detailed error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Toggle User status (suspend / activate)
async function toggleUserStatus(req, res) {
  try {
    const targetUserId = parseInt(req.params.userId);
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: 'You cannot suspend your own administrator account!' });
    }

    // Get current status
    const selectRes = await query('SELECT status, role FROM users WHERE id = $1', [targetUserId]);
    if (selectRes.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = selectRes.rows[0];
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot modify statuses of other administrators.' });
    }

    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    
    await query('UPDATE users SET status = $1 WHERE id = $2', [nextStatus, targetUserId]);

    return res.status(200).json({ 
      message: `User status changed to ${nextStatus} successfully.`, 
      status: nextStatus 
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Change User role
async function changeUserRole(req, res) {
  try {
    const targetUserId = parseInt(req.params.userId);
    const { newRole } = req.body; // 'student', 'lecturer', 'researcher', 'admin'
    const currentUserId = req.user.id;

    if (!newRole || !['student', 'lecturer', 'researcher', 'admin'].includes(newRole)) {
      return res.status(400).json({ message: 'A valid role is required.' });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: 'You cannot demote yourself from administrator status!' });
    }

    const checkRes = await query('SELECT role FROM users WHERE id = $1', [targetUserId]);
    if (checkRes.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await query('UPDATE users SET role = $1 WHERE id = $2', [newRole, targetUserId]);

    return res.status(200).json({ message: 'User role updated successfully.', role: newRole });
  } catch (error) {
    console.error('Change user role error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Admin deletion controls
async function adminDeleteCommunity(req, res) {
  try {
    const id = parseInt(req.params.id);
    await query('DELETE FROM academic_communities WHERE id = $1', [id]);
    return res.status(200).json({ message: 'Community deleted successfully by administrator.' });
  } catch (error) {
    console.error('Admin delete community error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

async function adminDeleteEvent(req, res) {
  try {
    const id = parseInt(req.params.id);
    await query('DELETE FROM events WHERE id = $1', [id]);
    return res.status(200).json({ message: 'Event deleted successfully by administrator.' });
  } catch (error) {
    console.error('Admin delete event error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = {
  getAdminStats,
  getAllUsersDetailed,
  toggleUserStatus,
  changeUserRole,
  adminDeleteCommunity,
  adminDeleteEvent,
};
