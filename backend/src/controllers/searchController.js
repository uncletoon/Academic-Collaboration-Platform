const { query } = require('../config/db');

// Global Search engine across users, communities, projects, news, events
async function globalSearch(req, res) {
  try {
    const searchTerm = req.query.q;
    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(200).json({
        users: [],
        communities: [],
        projects: [],
        news: [],
        events: []
      });
    }

    const pattern = `%${searchTerm.trim()}%`;

    // 1. Search Users
    const usersPromise = query(`
      SELECT u.id, u.full_name, u.email, u.role, u.avatar_url, i.name as institution_name
      FROM users u
      LEFT JOIN institutions i ON u.institution_id = i.id
      WHERE (u.full_name ILIKE $1 OR u.email ILIKE $1)
        AND u.status = 'active' AND u.approval_status = 'approved'
      LIMIT 10
    `, [pattern]);

    // 2. Search Communities
    const communitiesPromise = query(`
      SELECT ac.*, u.full_name as creator_name
      FROM academic_communities ac
      LEFT JOIN users u ON ac.created_by = u.id
      WHERE ac.name ILIKE $1 OR ac.description ILIKE $1 OR ac.category ILIKE $1
      LIMIT 10
    `, [pattern]);

    // 3. Search private project overviews using the same request-eligibility rules as the directory.
    const projectsPromise = query(`
      SELECT p.id, p.title, p.description, p.status, p.access_scope, p.institution_id,
             p.privacy_type, u.full_name as creator_name, i.name as institution_name,
             (SELECT COUNT(*)::int FROM project_members pmc WHERE pmc.project_id = p.id) AS member_count,
             CASE
               WHEN p.created_by = $2 THEN 'owner'
               WHEN EXISTS (SELECT 1 FROM project_members pmm WHERE pmm.project_id = p.id AND pmm.user_id = $2) THEN 'member'
               WHEN EXISTS (SELECT 1 FROM project_join_requests pjr WHERE pjr.project_id = p.id AND pjr.user_id = $2 AND pjr.status = 'pending') THEN 'pending'
               ELSE 'available'
             END AS membership_status
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN institutions i ON p.institution_id = i.id
      WHERE (p.title ILIKE $1 OR p.description ILIKE $1)
        AND p.privacy_type = 'private'
        AND ($4::boolean
          OR p.created_by = $2
          OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $2)
          OR p.access_scope = 'everyone'
          OR (p.access_scope = 'institution' AND p.institution_id = $3))
      LIMIT 10
    `, [pattern, req.user.id, req.user.institution_id || null, req.user.role === 'admin']);

    // 4. Search published news
    const newsPromise = query(`
      SELECT n.*, u.full_name as author_name
      FROM news n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.title ILIKE $1 OR n.description ILIKE $1 OR n.category ILIKE $1
      LIMIT 10
    `, [pattern]);

    // 5. Search Events
    const eventsPromise = query(`
      SELECT e.*, u.full_name as organizer_name, i.name as institution_name
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      LEFT JOIN institutions i ON e.institution_id = i.id
      WHERE e.title ILIKE $1 OR e.description ILIKE $1 OR e.location ILIKE $1
      LIMIT 10
    `, [pattern]);

    // Execute all queries in parallel
    const [usersRes, communitiesRes, projectsRes, newsRes, eventsRes] = await Promise.all([
      usersPromise,
      communitiesPromise,
      projectsPromise,
      newsPromise,
      eventsPromise
    ]);

    return res.status(200).json({
      users: usersRes.rows,
      communities: communitiesRes.rows,
      projects: projectsRes.rows,
      news: newsRes.rows,
      events: eventsRes.rows
    });
  } catch (error) {
    console.error('Global search error:', error);
    return res.status(500).json({ message: 'Internal server error performing search.' });
  }
}

module.exports = {
  globalSearch,
};
