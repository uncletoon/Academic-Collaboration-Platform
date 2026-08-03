const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'academic_collaboration_secret_key_777';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Helper to generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      institution_id: user.institution_id,
      department_id: user.department_id,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// User Registration
async function register(req, res) {
  try {
    const { email, password, fullName, role, institutionId, departmentId, bio } = req.body;
    const studentId = typeof req.body.studentId === 'string' ? req.body.studentId.trim() : '';

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ message: 'Email, password, full name, and role are required.' });
    }

    // Privileged roles are assigned only from the protected administrator panel.
    if (!['student', 'lecturer', 'researcher'].includes(role)) {
      return res.status(400).json({ message: 'Please select a valid public academic role.' });
    }

    const selectedRole = await query(
      `SELECT id, name, base_role, color FROM user_roles
       WHERE role_key = $1 AND institution_id IS NULL AND base_role IN ('student', 'lecturer')
       LIMIT 1`,
      [role],
    );
    if (!selectedRole.rowCount) {
      return res.status(400).json({ message: 'The selected academic role is not available.' });
    }

    if (selectedRole.rows[0].base_role === 'student' && !/^\d{1,10}$/.test(studentId)) {
      return res.status(400).json({ message: 'Student ID is required and must contain no more than 10 digits.' });
    }

    const parsedInstitutionId = institutionId && /^\d+$/.test(String(institutionId)) ? Number(institutionId) : null;
    const parsedDepartmentId = departmentId && /^\d+$/.test(String(departmentId)) ? Number(departmentId) : null;
    if (departmentId && !parsedDepartmentId) {
      return res.status(400).json({ message: 'Please select a valid department.' });
    }
    if (institutionId && !parsedInstitutionId) {
      return res.status(400).json({ message: 'Please select a valid institution.' });
    }
    if (parsedDepartmentId) {
      const department = await query(
        'SELECT id FROM departments WHERE id = $1 AND institution_id = $2',
        [parsedDepartmentId, parsedInstitutionId],
      );
      if (!parsedInstitutionId || !department.rowCount) {
        return res.status(400).json({ message: 'The selected department does not belong to the selected institution.' });
      }
    }

    // Check if user already exists
    const userExist = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userExist.rowCount > 0) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // Save to Database
    const insertQuery = `
      INSERT INTO users (email, password_hash, full_name, role, role_id, institution_id, department_id, student_id, bio)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, full_name, role, role_id, institution_id, department_id, student_id, bio, status, created_at
    `;
    
    const result = await query(insertQuery, [
      email.toLowerCase(),
      passwordHash,
      fullName,
      selectedRole.rows[0].base_role,
      selectedRole.rows[0].id,
      parsedInstitutionId,
      parsedDepartmentId,
      selectedRole.rows[0].base_role === 'student' ? studentId : null,
      bio || ''
    ]);

    const newUser = result.rows[0];
    newUser.role_name = selectedRole.rows[0].name;
    newUser.role_color = selectedRole.rows[0].color;
    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: newUser,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server registration error' });
  }
}

// User Login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find User
    const selectQuery = `
      SELECT u.*, i.name as institution_name, d.name as department_name,
             COALESCE(r.name, INITCAP(u.role)) AS role_name,
             COALESCE(r.color, '#2563EB') AS role_color
      FROM users u
      LEFT JOIN institutions i ON u.institution_id = i.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.email = $1
    `;
    const result = await query(selectQuery, [email.toLowerCase()]);

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Check status
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'This account has been suspended. Please contact admin.' });
    }

    // Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Clean user object (remove hash)
    delete user.password_hash;

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server login error' });
  }
}

// Get User Profile
async function getProfile(req, res) {
  try {
    const userId = req.params.id ? parseInt(req.params.id) : req.user.id;

    const selectQuery = `
      SELECT u.id, u.email, u.full_name, u.role, u.role_id, u.institution_id, u.department_id, u.student_id, u.bio, u.avatar_url, u.status, u.created_at,
             i.name as institution_name, d.name as department_name,
             COALESCE(r.name, INITCAP(u.role)) AS role_name,
             COALESCE(r.color, '#2563EB') AS role_color
      FROM users u
      LEFT JOIN institutions i ON u.institution_id = i.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const result = await query(selectQuery, [userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Internal server error fetching profile.' });
  }
}

// Update User Profile
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { fullName, bio, institutionId, departmentId } = req.body;
    let avatarUrl = null;

    if (req.file) {
      // Store relative path to display on client
      avatarUrl = `/uploads/avatars/${req.file.filename}`;
    }

    // Retrieve original profile values
    const currentProfile = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (currentProfile.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const current = currentProfile.rows[0];

    const updatedFullName = fullName || current.full_name;
    const updatedBio = bio !== undefined ? bio : current.bio;
    let updatedInstId = current.institution_id;
    let updatedDeptId = current.department_id;

    // Affiliation is immutable for regular users. Only the system administrator
    // may change (or clear) their institution and department from this endpoint.
    if (req.user.role === 'admin') {
      const hasInstitution = Object.prototype.hasOwnProperty.call(req.body, 'institutionId');
      const hasDepartment = Object.prototype.hasOwnProperty.call(req.body, 'departmentId');
      const parseNullableId = (value) => {
        if (value === '' || value === null || value === undefined) return null;
        return /^\d+$/.test(String(value)) && Number(value) > 0 ? Number(value) : NaN;
      };

      if (hasInstitution) updatedInstId = parseNullableId(institutionId);
      if (hasDepartment) updatedDeptId = parseNullableId(departmentId);
      if (Number.isNaN(updatedInstId) || Number.isNaN(updatedDeptId)) {
        return res.status(400).json({ message: 'Please select a valid institution and department.' });
      }
      if (updatedDeptId) {
        const department = await query(
          'SELECT id FROM departments WHERE id = $1 AND institution_id = $2',
          [updatedDeptId, updatedInstId],
        );
        if (!updatedInstId || !department.rowCount) {
          return res.status(400).json({ message: 'The selected department does not belong to the selected institution.' });
        }
      }
    }
    const updatedAvatarUrl = avatarUrl || current.avatar_url;

    const updateQuery = `
      UPDATE users
      SET full_name = $1, bio = $2, institution_id = $3, department_id = $4, avatar_url = $5
      WHERE id = $6
      RETURNING id, email, full_name, role, role_id, institution_id, department_id, bio, avatar_url, status, created_at
    `;

    await query(updateQuery, [
      updatedFullName,
      updatedBio,
      updatedInstId,
      updatedDeptId,
      updatedAvatarUrl,
      userId
    ]);

    // Fetch expanded details with labels
    const expandedQuery = `
      SELECT u.*, i.name as institution_name, d.name as department_name,
             COALESCE(r.name, INITCAP(u.role)) AS role_name,
             COALESCE(r.color, '#2563EB') AS role_color
      FROM users u
      LEFT JOIN institutions i ON u.institution_id = i.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const finalResult = await query(expandedQuery, [userId]);

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: finalResult.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Internal server error updating profile.' });
  }
}

// Fetch all users (for search and direct messaging selectors)
async function getUsers(req, res) {
  try {
    const listQuery = `
      SELECT u.id, u.full_name, u.email, u.role, u.avatar_url,
             i.name as institution_name, d.name as department_name
      FROM users u
      LEFT JOIN institutions i ON u.institution_id = i.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.status = 'active' AND u.id != $1
      ORDER BY u.full_name ASC
    `;
    const result = await query(listQuery, [req.user.id]);
    return res.status(200).json({ users: result.rows[0] ? result.rows : [] });
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ message: 'Internal server error fetching users list.' });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  getUsers,
};
