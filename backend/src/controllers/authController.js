const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { createUserNotification } = require('../services/notificationService');
const {
  cleanString,
  isValidPersonName,
  isValidStudentId,
  professionalDetails,
  hasCompleteProfessionalDetails,
} = require('../utils/validators');
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
    const { institutionId, departmentId } = req.body;
    const email = cleanString(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const fullName = cleanString(req.body.fullName);
    const role = cleanString(req.body.role);
    const studentId = cleanString(req.body.studentId);
    const bio = cleanString(req.body.bio);
    const professional = professionalDetails(req.body);

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ message: 'Email, password, full name, and role are required.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
    }
    if (!isValidPersonName(fullName)) {
      return res.status(400).json({ message: 'Full name must use letters, spaces, apostrophes, or hyphens only.' });
    }

    if (!['student', 'lecturer', 'institution_admin'].includes(role)) {
      return res.status(400).json({ message: 'Please select a valid public academic role.' });
    }

    const selectedRole = await query(
      `SELECT id, name, base_role, color FROM user_roles
       WHERE role_key = $1 AND institution_id IS NULL AND base_role IN ('student', 'lecturer', 'institution_admin')
       LIMIT 1`,
      [role],
    );
    if (!selectedRole.rowCount) {
      return res.status(400).json({ message: 'The selected academic role is not available.' });
    }

    if (selectedRole.rows[0].base_role === 'student' && !isValidStudentId(studentId)) {
      return res.status(400).json({ message: 'Student ID may contain letters, numbers, slashes, or hyphens (maximum 30 characters).' });
    }

    const parsedInstitutionId = institutionId && /^\d+$/.test(String(institutionId)) ? Number(institutionId) : null;
    const parsedDepartmentId = departmentId && /^\d+$/.test(String(departmentId)) ? Number(departmentId) : null;
    if (departmentId && !parsedDepartmentId) {
      return res.status(400).json({ message: 'Please select a valid department.' });
    }
    if (institutionId && !parsedInstitutionId) {
      return res.status(400).json({ message: 'Please select a valid institution.' });
    }
    if (['lecturer', 'institution_admin'].includes(selectedRole.rows[0].base_role) && !parsedInstitutionId) {
      return res.status(400).json({ message: 'Lecturers and Institution Administrators must select an institution.' });
    }
    if (selectedRole.rows[0].base_role === 'lecturer' && !parsedDepartmentId) {
      return res.status(400).json({ message: 'Lecturers must select their department.' });
    }
    if (['lecturer', 'institution_admin'].includes(selectedRole.rows[0].base_role)
      && !hasCompleteProfessionalDetails(professional)) {
      return res.status(400).json({ message: 'Staff ID, job title, qualification, expertise, and a valid phone number are required for this role.' });
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
    const userExist = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExist.rowCount > 0) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // Save to Database
    const insertQuery = `
      INSERT INTO users (
        email, password_hash, full_name, role, role_id, institution_id, department_id,
        student_id, staff_id, job_title, qualification, expertise, phone_number, bio, approval_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, email, full_name, role, role_id, institution_id, department_id, student_id,
                staff_id, job_title, qualification, expertise, phone_number, bio, status,
                approval_status, created_at
    `;
    
    const result = await query(insertQuery, [
      email,
      passwordHash,
      fullName,
      selectedRole.rows[0].base_role,
      selectedRole.rows[0].id,
      parsedInstitutionId,
      parsedDepartmentId,
      selectedRole.rows[0].base_role === 'student' ? studentId : null,
      professional.staffId || null,
      professional.jobTitle || null,
      professional.qualification || null,
      professional.expertise || null,
      professional.phoneNumber || null,
      bio,
      selectedRole.rows[0].base_role === 'institution_admin' ? 'pending' : 'approved',
    ]);

    const newUser = result.rows[0];
    newUser.role_name = selectedRole.rows[0].name;
    newUser.role_color = selectedRole.rows[0].color;
    const requiresApproval = newUser.approval_status === 'pending';
    if (requiresApproval) {
      const administrators = await query("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
      await Promise.all(administrators.rows.map(({ id }) => createUserNotification({
        userId: id,
        title: 'Institution Administrator approval required',
        content: `${newUser.full_name} submitted an Institution Administrator application for review.`,
        type: 'system',
        link: '/admin',
      })));
    }

    return res.status(201).json({
      message: requiresApproval
        ? 'Your Institution Administrator registration was completed successfully. Please wait for a System Administrator to review and approve your account.'
        : 'Registration successful',
      token: requiresApproval ? null : generateToken(newUser),
      user: newUser,
      requiresApproval,
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

    // Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.approval_status === 'pending') {
      return res.status(403).json({ message: 'Your Institution Administrator application is still awaiting System Administrator approval.' });
    }
    if (user.approval_status === 'rejected') {
      return res.status(403).json({ message: user.approval_notes || 'Your Institution Administrator application was not approved.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'This account has been suspended. Please contact admin.' });
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
      SELECT u.id, u.email, u.full_name, u.role, u.role_id, u.institution_id, u.department_id,
             u.student_id, u.staff_id, u.job_title, u.qualification, u.expertise, u.phone_number,
             u.bio, u.avatar_url, u.status, u.approval_status, u.approved_at, u.created_at,
             i.name as institution_name, d.name as department_name,
             COALESCE(r.name, INITCAP(u.role)) AS role_name,
             COALESCE(r.color, '#2563EB') AS role_color
      FROM users u
      LEFT JOIN institutions i ON u.institution_id = i.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.id = $1 AND (u.approval_status = 'approved' OR $2 = 'admin')
    `;
    const result = await query(selectQuery, [userId, req.user.role]);

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
    const { institutionId, departmentId } = req.body;
    const fullName = cleanString(req.body.fullName);
    const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : undefined;
    const professional = professionalDetails(req.body);
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

    const hasFullName = Object.prototype.hasOwnProperty.call(req.body, 'fullName');
    const updatedFullName = hasFullName ? fullName : current.full_name;
    if (!isValidPersonName(updatedFullName)) {
      return res.status(400).json({ message: 'Full name must use letters, spaces, apostrophes, or hyphens only.' });
    }
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
    const needsProfessionalDetails = ['lecturer', 'institution_admin', 'admin'].includes(current.role);
    const updatedProfessional = {
      staffId: professional.staffId || current.staff_id || '',
      jobTitle: professional.jobTitle || current.job_title || '',
      qualification: professional.qualification || current.qualification || '',
      expertise: professional.expertise || current.expertise || '',
      phoneNumber: professional.phoneNumber || current.phone_number || '',
    };
    if (needsProfessionalDetails && !hasCompleteProfessionalDetails(updatedProfessional)) {
      return res.status(400).json({ message: 'Staff ID, job title, qualification, expertise, and a valid phone number are required for this role.' });
    }

    const updateQuery = `
      UPDATE users
      SET full_name = $1, bio = $2, institution_id = $3, department_id = $4, avatar_url = $5,
          staff_id = $6, job_title = $7, qualification = $8, expertise = $9, phone_number = $10
      WHERE id = $11
      RETURNING id, email, full_name, role, role_id, institution_id, department_id, student_id,
                staff_id, job_title, qualification, expertise, phone_number, bio, avatar_url,
                status, approval_status, approved_at, created_at
    `;

    await query(updateQuery, [
      updatedFullName,
      updatedBio,
      updatedInstId,
      updatedDeptId,
      updatedAvatarUrl,
      needsProfessionalDetails ? updatedProfessional.staffId : current.staff_id,
      needsProfessionalDetails ? updatedProfessional.jobTitle : current.job_title,
      needsProfessionalDetails ? updatedProfessional.qualification : current.qualification,
      needsProfessionalDetails ? updatedProfessional.expertise : current.expertise,
      needsProfessionalDetails ? updatedProfessional.phoneNumber : current.phone_number,
      userId
    ]);

    // Fetch expanded details with labels
    const expandedQuery = `
      SELECT u.id, u.email, u.full_name, u.role, u.role_id, u.institution_id, u.department_id,
             u.student_id, u.staff_id, u.job_title, u.qualification, u.expertise, u.phone_number,
             u.bio, u.avatar_url, u.status, u.approval_status, u.approved_at, u.created_at,
             i.name as institution_name, d.name as department_name,
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
        AND u.approval_status = 'approved'
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
