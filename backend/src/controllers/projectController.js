const fs = require('fs');
const path = require('path');
const { pool, query } = require('../config/db');
const { createUserNotification } = require('../services/notificationService');

const parseProjectId = (value) => {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const cleanRequirements = (value) => {
  let items = value;
  if (typeof value === 'string') {
    try {
      items = JSON.parse(value);
    } catch {
      items = value.split('\n');
    }
  }
  if (!Array.isArray(items)) return [];
  return items.map((item) => String(item).trim()).filter(Boolean);
};

const isManager = (project, user) =>
  Number(project.created_by) === Number(user.id) || user.role === 'admin';

const removePhysicalFile = (filepath) => {
  if (!filepath) return;
  const absolutePath = path.resolve(__dirname, '..', '..', filepath.replace(/^[/\\]+/, ''));
  const uploadRoot = path.resolve(__dirname, '..', '..', 'uploads', 'projects');
  if (absolutePath.startsWith(uploadRoot) && fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

async function getUserProjects(req, res) {
  try {
    const result = await query(
      `SELECT p.*, u.full_name AS creator_name, i.name AS institution_name,
              (SELECT COUNT(*)::int FROM project_members pmc WHERE pmc.project_id = p.id) AS member_count,
              CASE
                WHEN p.created_by = $1 THEN 'owner'
                WHEN EXISTS (SELECT 1 FROM project_members pmm WHERE pmm.project_id = p.id AND pmm.user_id = $1) THEN 'member'
                WHEN EXISTS (SELECT 1 FROM project_join_requests pjr WHERE pjr.project_id = p.id AND pjr.user_id = $1 AND pjr.status = 'pending') THEN 'pending'
                WHEN EXISTS (SELECT 1 FROM project_join_requests pjr WHERE pjr.project_id = p.id AND pjr.user_id = $1 AND pjr.status = 'rejected') THEN 'rejected'
                ELSE 'available'
              END AS membership_status
       FROM projects p
       LEFT JOIN users u ON u.id = p.created_by
       LEFT JOIN institutions i ON i.id = p.institution_id
       WHERE p.privacy_type = 'private'
         AND ($3::boolean
          OR p.created_by = $1
          OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $1)
          OR p.access_scope = 'everyone'
          OR (p.access_scope = 'institution' AND p.institution_id = $2))
       ORDER BY p.created_at DESC`,
      [req.user.id, req.user.institution_id || null, req.user.role === 'admin'],
    );
    return res.json({ projects: result.rows });
  } catch (error) {
    console.error('Fetch collaboration projects error:', error);
    return res.status(500).json({ message: 'Unable to load collaboration projects.' });
  }
}

async function getProjectById(req, res) {
  try {
    const projectId = parseProjectId(req.params.id);
    if (!projectId) return res.status(400).json({ message: 'Invalid project ID.' });

    const projectResult = await query(
      `SELECT p.*, u.full_name AS creator_name, i.name AS institution_name
       FROM projects p
       LEFT JOIN users u ON u.id = p.created_by
       LEFT JOIN institutions i ON i.id = p.institution_id
       WHERE p.id = $1`,
      [projectId],
    );
    if (!projectResult.rowCount) return res.status(404).json({ message: 'Project not found.' });

    const project = projectResult.rows[0];
    const memberResult = await query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.id],
    );
    const manager = isManager(project, req.user);
    const member = manager || memberResult.rowCount > 0;
    const institutionEligible =
      project.access_scope === 'everyone' ||
      Number(project.institution_id) === Number(req.user.institution_id);

    if (!member && req.user.role !== 'admin' && !institutionEligible) {
      return res.status(403).json({ message: 'This collaboration is limited to its owner’s institution.' });
    }

    const requestResult = await query(
      `SELECT id, status, requested_at, responded_at
       FROM project_join_requests WHERE project_id = $1 AND user_id = $2`,
      [projectId, req.user.id],
    );

    let members = [];
    let files = [];
    let requests = [];
    if (member) {
      const [membersResult, filesResult] = await Promise.all([
        query(
          `SELECT u.id, u.full_name, u.email, u.role AS user_role, u.avatar_url,
                  i.name AS institution_name, pm.role AS project_role
           FROM project_members pm
           JOIN users u ON u.id = pm.user_id
           LEFT JOIN institutions i ON i.id = u.institution_id
           WHERE pm.project_id = $1 ORDER BY (u.id = $2) DESC, u.full_name`,
          [projectId, project.created_by],
        ),
        query(
          `SELECT pf.id, pf.filename, pf.mime_type, pf.file_size, pf.uploaded_at,
                  u.full_name AS uploaded_by_name
           FROM project_files pf
           LEFT JOIN users u ON u.id = pf.uploaded_by
           WHERE pf.project_id = $1 ORDER BY pf.uploaded_at DESC`,
          [projectId],
        ),
      ]);
      members = membersResult.rows;
      files = filesResult.rows;
    }

    if (manager) {
      const requestsResult = await query(
        `SELECT pjr.id, pjr.status, pjr.requested_at, u.id AS user_id, u.full_name,
                u.email, u.avatar_url, i.name AS institution_name
         FROM project_join_requests pjr
         JOIN users u ON u.id = pjr.user_id
         LEFT JOIN institutions i ON i.id = u.institution_id
         WHERE pjr.project_id = $1 AND pjr.status = 'pending'
         ORDER BY pjr.requested_at`,
        [projectId],
      );
      requests = requestsResult.rows;
    }

    return res.json({
      project,
      members,
      files,
      requests,
      access: {
        isOwner: Number(project.created_by) === Number(req.user.id),
        isAdmin: req.user.role === 'admin',
        isMember: member,
        canManage: manager,
        requestStatus: requestResult.rows[0]?.status || null,
      },
    });
  } catch (error) {
    console.error('Fetch collaboration details error:', error);
    return res.status(500).json({ message: 'Unable to load this collaboration.' });
  }
}

async function createProject(req, res) {
  const uploadedFiles = req.files || [];
  const client = await pool.connect();
  try {
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const requirements = cleanRequirements(req.body.requirements);
    const accessScope = req.body.accessScope === 'institution' ? 'institution' : 'everyone';

    if (!title || !description || !requirements.length) {
      uploadedFiles.forEach((file) => removePhysicalFile(`/uploads/projects/${file.filename}`));
      return res.status(400).json({
        message: 'Title, description, and at least one requirement are required.',
      });
    }
    if (accessScope === 'institution' && !req.user.institution_id) {
      uploadedFiles.forEach((file) => removePhysicalFile(`/uploads/projects/${file.filename}`));
      return res.status(400).json({ message: 'Add an institution to your profile before limiting a project to it.' });
    }

    await client.query('BEGIN');
    const projectResult = await client.query(
      `INSERT INTO projects
         (title, description, requirements, access_scope, institution_id, created_by, status)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, 'planning') RETURNING *`,
      [
        title,
        description,
        JSON.stringify(requirements),
        accessScope,
        accessScope === 'institution' ? req.user.institution_id : null,
        req.user.id,
      ],
    );
    const project = projectResult.rows[0];
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'lead') ON CONFLICT DO NOTHING`,
      [project.id, req.user.id],
    );
    for (const file of uploadedFiles) {
      await client.query(
        `INSERT INTO project_files
           (project_id, filename, filepath, mime_type, file_size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [project.id, file.originalname, `/uploads/projects/${file.filename}`, file.mimetype, file.size, req.user.id],
      );
    }
    await client.query('COMMIT');
    return res.status(201).json({ message: 'Collaboration created successfully.', project });
  } catch (error) {
    await client.query('ROLLBACK');
    uploadedFiles.forEach((file) => removePhysicalFile(`/uploads/projects/${file.filename}`));
    console.error('Create collaboration error:', error);
    return res.status(500).json({ message: 'Unable to create the collaboration.' });
  } finally {
    client.release();
  }
}

async function requestToJoin(req, res) {
  try {
    const projectId = parseProjectId(req.params.id);
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!projectResult.rowCount) return res.status(404).json({ message: 'Project not found.' });
    const project = projectResult.rows[0];
    if (Number(project.created_by) === Number(req.user.id)) {
      return res.status(400).json({ message: 'You already own this collaboration.' });
    }
    if (
      project.access_scope === 'institution' &&
      Number(project.institution_id) !== Number(req.user.institution_id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Only users from the owner’s institution may request access.' });
    }
    const membership = await query(
      'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.id],
    );
    if (membership.rowCount) return res.status(400).json({ message: 'You are already a member.' });

    await query(
      `INSERT INTO project_join_requests (project_id, user_id, status, requested_at, responded_at, responded_by)
       VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP, NULL, NULL)
       ON CONFLICT (project_id, user_id) DO UPDATE
       SET status = 'pending', requested_at = CURRENT_TIMESTAMP, responded_at = NULL, responded_by = NULL`,
      [projectId, req.user.id],
    );
    await createUserNotification({
      userId: project.created_by,
      title: `New request for "${project.title}"`,
      content: `${req.user.full_name || req.user.email || 'A user'} requested to join "${project.title}".`,
      type: 'project',
      link: `/projects?id=${projectId}`,
    });
    return res.json({ message: 'Your request was sent to the project owner.', status: 'pending' });
  } catch (error) {
    console.error('Request collaboration access error:', error);
    return res.status(500).json({ message: 'Unable to send your request.' });
  }
}

async function respondToJoinRequest(req, res) {
  const client = await pool.connect();
  try {
    const projectId = parseProjectId(req.params.id);
    const requestId = parseProjectId(req.params.requestId);
    const action = req.body.action;
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be accept or reject.' });
    }
    const projectResult = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!projectResult.rowCount) return res.status(404).json({ message: 'Project not found.' });
    const project = projectResult.rows[0];
    if (!isManager(project, req.user)) {
      return res.status(403).json({ message: 'Only the project owner or system admin can respond.' });
    }

    await client.query('BEGIN');
    const requestResult = await client.query(
      `SELECT * FROM project_join_requests
       WHERE id = $1 AND project_id = $2 AND status = 'pending' FOR UPDATE`,
      [requestId, projectId],
    );
    if (!requestResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Pending request not found.' });
    }
    const joinRequest = requestResult.rows[0];
    const nextStatus = action === 'accept' ? 'accepted' : 'rejected';
    await client.query(
      `UPDATE project_join_requests
       SET status = $1, responded_at = CURRENT_TIMESTAMP, responded_by = $2 WHERE id = $3`,
      [nextStatus, req.user.id, requestId],
    );
    if (action === 'accept') {
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, 'contributor') ON CONFLICT DO NOTHING`,
        [projectId, joinRequest.user_id],
      );
    }
    await client.query('COMMIT');
    await createUserNotification({
      userId: joinRequest.user_id,
      title: action === 'accept' ? 'Collaboration request accepted' : 'Collaboration request declined',
      content: `Your request to join "${project.title}" was ${action === 'accept' ? 'accepted' : 'declined'}.`,
      type: 'project',
      link: `/projects?id=${projectId}`,
    });
    return res.json({ message: `Request ${nextStatus}.` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Respond to collaboration request error:', error);
    return res.status(500).json({ message: 'Unable to respond to this request.' });
  } finally {
    client.release();
  }
}

async function leaveProject(req, res) {
  try {
    const projectId = parseProjectId(req.params.id);
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!projectResult.rowCount) return res.status(404).json({ message: 'Project not found.' });
    if (Number(projectResult.rows[0].created_by) === Number(req.user.id)) {
      return res.status(400).json({ message: 'The owner cannot leave their project. Delete it instead.' });
    }
    const result = await query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.id],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'You are not a member of this project.' });
    await query(
      `UPDATE project_join_requests SET status = 'rejected', responded_at = CURRENT_TIMESTAMP
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, req.user.id],
    );
    return res.json({ message: 'You left the collaboration.' });
  } catch (error) {
    console.error('Leave collaboration error:', error);
    return res.status(500).json({ message: 'Unable to leave this collaboration.' });
  }
}

async function removeProjectMember(req, res) {
  try {
    const projectId = parseProjectId(req.params.id);
    const targetUserId = parseProjectId(req.params.memberId);
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!projectResult.rowCount) return res.status(404).json({ message: 'Project not found.' });
    const project = projectResult.rows[0];
    if (!isManager(project, req.user)) {
      return res.status(403).json({ message: 'Only the owner or system admin can remove members.' });
    }
    if (Number(project.created_by) === Number(targetUserId)) {
      return res.status(400).json({ message: 'The project owner cannot be removed.' });
    }
    await query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, targetUserId]);
    return res.json({ message: 'Member removed.' });
  } catch (error) {
    console.error('Remove collaboration member error:', error);
    return res.status(500).json({ message: 'Unable to remove this member.' });
  }
}

async function uploadProjectFile(req, res) {
  try {
    const projectId = parseProjectId(req.params.id);
    if (!req.file) return res.status(400).json({ message: 'Choose a supportive document.' });
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!projectResult.rowCount) {
      removePhysicalFile(`/uploads/projects/${req.file.filename}`);
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (!isManager(projectResult.rows[0], req.user)) {
      removePhysicalFile(`/uploads/projects/${req.file.filename}`);
      return res.status(403).json({ message: 'Only the owner or system admin can add documents.' });
    }
    const result = await query(
      `INSERT INTO project_files
         (project_id, filename, filepath, mime_type, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, filename, mime_type, file_size, uploaded_at`,
      [projectId, req.file.originalname, `/uploads/projects/${req.file.filename}`, req.file.mimetype, req.file.size, req.user.id],
    );
    return res.status(201).json({ message: 'Supportive document added.', file: result.rows[0] });
  } catch (error) {
    if (req.file) removePhysicalFile(`/uploads/projects/${req.file.filename}`);
    console.error('Upload collaboration file error:', error);
    return res.status(500).json({ message: 'Unable to upload this document.' });
  }
}

async function downloadProjectFile(req, res) {
  try {
    const projectId = parseProjectId(req.params.id);
    const fileId = parseProjectId(req.params.fileId);
    const fileResult = await query(
      `SELECT pf.*, p.created_by FROM project_files pf
       JOIN projects p ON p.id = pf.project_id
       WHERE pf.id = $1 AND pf.project_id = $2`,
      [fileId, projectId],
    );
    if (!fileResult.rowCount) return res.status(404).json({ message: 'Document not found.' });
    const file = fileResult.rows[0];
    const membership = await query(
      'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.id],
    );
    if (!membership.rowCount && !isManager(file, req.user)) {
      return res.status(403).json({ message: 'Join this collaboration to access its documents.' });
    }
    const absolutePath = path.resolve(__dirname, '..', '..', file.filepath.replace(/^[/\\]+/, ''));
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ message: 'Document is missing from storage.' });
    if (req.query.download === '1') return res.download(absolutePath, file.filename);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="document"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    );
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error('Read collaboration document error:', error);
    return res.status(500).json({ message: 'Unable to open this document.' });
  }
}

async function deleteProjectFile(req, res) {
  try {
    const projectId = parseProjectId(req.params.id);
    const fileId = parseProjectId(req.params.fileId);
    const result = await query(
      `SELECT pf.*, p.created_by FROM project_files pf
       JOIN projects p ON p.id = pf.project_id
       WHERE pf.id = $1 AND pf.project_id = $2`,
      [fileId, projectId],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Document not found.' });
    const file = result.rows[0];
    if (!isManager(file, req.user)) {
      return res.status(403).json({ message: 'Only the owner or system admin can delete documents.' });
    }
    await query('DELETE FROM project_files WHERE id = $1', [fileId]);
    removePhysicalFile(file.filepath);
    return res.json({ message: 'Document deleted.' });
  } catch (error) {
    console.error('Delete collaboration document error:', error);
    return res.status(500).json({ message: 'Unable to delete this document.' });
  }
}

async function updateProject(req, res) {
  try {
    const projectId = parseProjectId(req.params.id);
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!projectResult.rowCount) return res.status(404).json({ message: 'Project not found.' });
    const current = projectResult.rows[0];
    if (!isManager(current, req.user)) {
      return res.status(403).json({ message: 'Only the owner or system admin can update this project.' });
    }
    const title = req.body.title === undefined ? current.title : String(req.body.title).trim();
    const description = req.body.description === undefined ? current.description : String(req.body.description).trim();
    const requirements = req.body.requirements === undefined ? current.requirements : cleanRequirements(req.body.requirements);
    const status = ['planning', 'active', 'completed'].includes(req.body.status) ? req.body.status : current.status;
    const accessScope = req.body.accessScope === undefined
      ? current.access_scope
      : req.body.accessScope === 'institution' ? 'institution' : 'everyone';
    if (!title || !description || !requirements.length) {
      return res.status(400).json({ message: 'Title, description, and at least one requirement are required.' });
    }
    if (accessScope === 'institution' && !req.user.institution_id) {
      return res.status(400).json({ message: 'Add an institution to your profile before using this access rule.' });
    }
    const institutionId = accessScope === 'institution'
      ? (current.institution_id || req.user.institution_id)
      : null;
    const result = await query(
      `UPDATE projects SET title = $1, description = $2, requirements = $3::jsonb,
         status = $4, access_scope = $5, institution_id = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [title, description, JSON.stringify(requirements), status, accessScope, institutionId, projectId],
    );
    return res.json({ message: 'Collaboration updated.', project: result.rows[0] });
  } catch (error) {
    console.error('Update collaboration error:', error);
    return res.status(500).json({ message: 'Unable to update this collaboration.' });
  }
}

async function deleteProject(req, res) {
  try {
    const projectId = parseProjectId(req.params.id);
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!projectResult.rowCount) return res.status(404).json({ message: 'Project not found.' });
    if (!isManager(projectResult.rows[0], req.user)) {
      return res.status(403).json({ message: 'Only the owner or system admin can delete this project.' });
    }
    const files = await query('SELECT filepath FROM project_files WHERE project_id = $1', [projectId]);
    await query('DELETE FROM projects WHERE id = $1', [projectId]);
    files.rows.forEach((file) => removePhysicalFile(file.filepath));
    return res.json({ message: 'Collaboration deleted.' });
  } catch (error) {
    console.error('Delete collaboration error:', error);
    return res.status(500).json({ message: 'Unable to delete this collaboration.' });
  }
}

module.exports = {
  getUserProjects,
  getProjectById,
  createProject,
  requestToJoin,
  respondToJoinRequest,
  leaveProject,
  removeProjectMember,
  uploadProjectFile,
  downloadProjectFile,
  deleteProjectFile,
  updateProject,
  deleteProject,
};
