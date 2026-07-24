const { query } = require('../config/db');
const { createUserNotification } = require('../services/notificationService');

// Get all academic communities
async function getAllCommunities(req, res) {
  try {
    const userId = req.user.id;
    // Get all communities and flag if user is a member
    const sql = `
      SELECT ac.*, 
             u.full_name as creator_name,
             (SELECT COUNT(*)::int FROM community_members WHERE community_id = ac.id) as member_count,
             EXISTS(SELECT 1 FROM community_members WHERE community_id = ac.id AND user_id = $1) as is_member
      FROM academic_communities ac
      LEFT JOIN users u ON ac.created_by = u.id
      ORDER BY ac.name ASC
    `;
    const result = await query(sql, [userId]);
    return res.status(200).json({ communities: result.rows });
  } catch (error) {
    console.error('Fetch communities error:', error);
    return res.status(500).json({ message: 'Internal server error fetching communities.' });
  }
}

// Get single community details
async function getCommunityById(req, res) {
  try {
    const userId = req.user.id;
    const communityId = parseInt(req.params.id);

    const communitySql = `
      SELECT ac.*, u.full_name as creator_name,
             EXISTS(SELECT 1 FROM community_members WHERE community_id = ac.id AND user_id = $1) as is_member
      FROM academic_communities ac
      LEFT JOIN users u ON ac.created_by = u.id
      WHERE ac.id = $2
    `;
    const result = await query(communitySql, [userId, communityId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Community not found.' });
    }

    const comm = result.rows[0];
    let members = [];

    // Only return members if user is a member, or user is owner, or user is admin
    if (comm.is_member || comm.created_by === userId || req.user.role === 'admin') {
      const membersSql = `
        SELECT u.id, u.full_name, u.email, u.role, u.avatar_url
        FROM community_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.community_id = $1
        ORDER BY u.full_name ASC
      `;
      const membersRes = await query(membersSql, [communityId]);
      members = membersRes.rows;
    }

    return res.status(200).json({
      community: comm,
      members: members
    });
  } catch (error) {
    console.error('Fetch community details error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Create community
async function createCommunity(req, res) {
  try {
    const { name, description, category, privacy_type, isInstitutional } = req.body;
    const userId = req.user.id;
    
    const actualPrivacy = privacy_type || (isInstitutional ? 'institution' : 'public');
    const institutionId = (actualPrivacy === 'institution') ? req.user.institution_id : null;

    if (!name || !category) {
      return res.status(400).json({ message: 'Community name and category are required.' });
    }

    // Check unique name
    const checkName = await query('SELECT id FROM academic_communities WHERE name = $1', [name]);
    if (checkName.rowCount > 0) {
      return res.status(400).json({ message: 'A community with this name already exists.' });
    }

    const insertSql = `
      INSERT INTO academic_communities (name, description, category, created_by, institution_id, privacy_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await query(insertSql, [name, description || '', category, userId, institutionId, actualPrivacy]);
    const community = result.rows[0];

    // Creator automatically joins community
    await query('INSERT INTO community_members (community_id, user_id) VALUES ($1, $2)', [community.id, userId]);

    return res.status(201).json({
      message: 'Community created successfully',
      community
    });
  } catch (error) {
    console.error('Create community error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Update Community
async function updateCommunity(req, res) {
  try {
    const communityId = parseInt(req.params.id);
    const userId = req.user.id;
    const { name, description, category, privacy_type } = req.body;

    const checkComm = await query('SELECT created_by FROM academic_communities WHERE id = $1', [communityId]);
    if (checkComm.rowCount === 0) {
      return res.status(404).json({ message: 'Community not found.' });
    }

    if (checkComm.rows[0].created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only the owner can edit this community.' });
    }

    const updateSql = `
      UPDATE academic_communities
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          privacy_type = COALESCE($4, privacy_type)
      WHERE id = $5
      RETURNING *
    `;
    const result = await query(updateSql, [name, description, category, privacy_type, communityId]);
    return res.status(200).json({ message: 'Community updated', community: result.rows[0] });
  } catch (error) {
    console.error('Update community error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Delete Community
async function deleteCommunity(req, res) {
  try {
    const communityId = parseInt(req.params.id);
    const userId = req.user.id;

    const checkComm = await query('SELECT created_by FROM academic_communities WHERE id = $1', [communityId]);
    if (checkComm.rowCount === 0) {
      return res.status(404).json({ message: 'Community not found.' });
    }

    if (checkComm.rows[0].created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only the owner can delete this community.' });
    }

    await query('DELETE FROM academic_communities WHERE id = $1', [communityId]);
    return res.status(200).json({ message: 'Community deleted successfully.' });
  } catch (error) {
    console.error('Delete community error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Remove Member
async function removeMember(req, res) {
  try {
    const communityId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);
    const currentUserId = req.user.id;

    const checkComm = await query('SELECT created_by FROM academic_communities WHERE id = $1', [communityId]);
    if (checkComm.rowCount === 0) {
      return res.status(404).json({ message: 'Community not found.' });
    }

    if (checkComm.rows[0].created_by !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only the owner can remove members.' });
    }

    if (checkComm.rows[0].created_by === targetUserId) {
       return res.status(400).json({ message: 'Cannot remove the owner of the community.' });
    }

    await query('DELETE FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, targetUserId]);
    return res.status(200).json({ message: 'Member removed successfully.' });
  } catch (error) {
    console.error('Remove member error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Join / Leave community toggle
async function toggleJoinCommunity(req, res) {
  try {
    const userId = req.user.id;
    const communityId = parseInt(req.params.id);

    const checkComm = await query('SELECT name, privacy_type, institution_id, created_by FROM academic_communities WHERE id = $1', [communityId]);
    if (checkComm.rowCount === 0) {
      return res.status(404).json({ message: 'Community not found.' });
    }
    const commInfo = checkComm.rows[0];

    const memberCheck = await query(
      'SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2',
      [communityId, userId]
    );

    if (memberCheck.rowCount > 0) {
      // Leave
      await query('DELETE FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, userId]);
      return res.status(200).json({ message: 'Left community successfully', isMember: false });
    } else {
      // Join rules
      if (commInfo.privacy_type === 'private' && req.user.role !== 'admin' && commInfo.created_by !== userId) {
         return res.status(403).json({ message: 'This community is private. You must be invited.' });
      }
      if (commInfo.privacy_type === 'institution' && commInfo.institution_id !== req.user.institution_id && req.user.role !== 'admin') {
         return res.status(403).json({ message: 'This community is restricted to another institution.' });
      }

      await query('INSERT INTO community_members (community_id, user_id) VALUES ($1, $2)', [communityId, userId]);
      return res.status(200).json({ message: 'Joined community successfully', isMember: true });
    }
  } catch (error) {
    console.error('Join/Leave community error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Invite User to Community
async function inviteUser(req, res) {
  try {
    const communityId = parseInt(req.params.id);
    const currentUserId = req.user.id;
    const { targetEmail } = req.body;

    const checkComm = await query('SELECT created_by FROM academic_communities WHERE id = $1', [communityId]);
    if (checkComm.rowCount === 0) return res.status(404).json({ message: 'Community not found.' });

    if (checkComm.rows[0].created_by !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the owner can invite users.' });
    }

    if (!targetEmail) return res.status(400).json({ message: 'Target email is required.' });

    const userQuery = await query('SELECT id FROM users WHERE email = $1', [targetEmail.toLowerCase()]);
    if (userQuery.rowCount === 0) return res.status(404).json({ message: 'User with this email not found.' });
    const targetUserId = userQuery.rows[0].id;

    const checkMem = await query('SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, targetUserId]);
    if (checkMem.rowCount > 0) return res.status(400).json({ message: 'User is already a member.' });

    const checkInv = await query('SELECT status FROM community_invitations WHERE community_id = $1 AND user_id = $2', [communityId, targetUserId]);
    
    if (checkInv.rowCount > 0) {
      if (checkInv.rows[0].status === 'pending') {
        return res.status(400).json({ message: 'Invitation already sent.' });
      } else {
        await query('UPDATE community_invitations SET status = $1, created_at = CURRENT_TIMESTAMP WHERE community_id = $2 AND user_id = $3', ['pending', communityId, targetUserId]);
      }
    } else {
      await query('INSERT INTO community_invitations (community_id, user_id, status) VALUES ($1, $2, $3)', [communityId, targetUserId, 'pending']);
    }
    
    // Notify target user
    createUserNotification({
      userId: targetUserId,
      title: 'Community Invitation',
      content: `You have been invited to join a community.`,
      type: 'community',
      link: `/communities/invitations`
    });

    return res.status(201).json({ message: 'User invited successfully.' });
  } catch (error) {
    console.error('Invite user error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Get Pending Invitations for User
async function getInvitations(req, res) {
  try {
    const userId = req.user.id;
    const sql = `
      SELECT ci.id, ci.community_id, ci.status, ci.created_at, ac.name as community_name, u.full_name as inviter_name
      FROM community_invitations ci
      JOIN academic_communities ac ON ci.community_id = ac.id
      JOIN users u ON ac.created_by = u.id
      WHERE ci.user_id = $1 AND ci.status = 'pending'
      ORDER BY ci.created_at DESC
    `;
    const result = await query(sql, [userId]);
    return res.status(200).json({ invitations: result.rows });
  } catch (error) {
    console.error('Get invitations error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Respond to Invitation
async function respondToInvitation(req, res) {
  try {
    const invitationId = parseInt(req.params.invitationId);
    const userId = req.user.id;
    const { action } = req.body; // 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) return res.status(400).json({ message: 'Invalid action.' });

    const checkInv = await query('SELECT * FROM community_invitations WHERE id = $1 AND user_id = $2 AND status = $3', [invitationId, userId, 'pending']);
    if (checkInv.rowCount === 0) return res.status(404).json({ message: 'Pending invitation not found.' });

    const inv = checkInv.rows[0];

    if (action === 'accept') {
       await query('INSERT INTO community_members (community_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [inv.community_id, userId]);
       await query('UPDATE community_invitations SET status = $1 WHERE id = $2', ['accepted', invitationId]);
       return res.status(200).json({ message: 'Invitation accepted.' });
    } else {
       await query('UPDATE community_invitations SET status = $1 WHERE id = $2', ['rejected', invitationId]);
       return res.status(200).json({ message: 'Invitation rejected.' });
    }
  } catch (error) {
    console.error('Respond invitation error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Get Community Posts
async function getCommunityPosts(req, res) {
  try {
    const userId = req.user.id;
    const communityId = parseInt(req.params.communityId);

    const checkMem = await query('SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, userId]);
    const checkComm = await query('SELECT created_by FROM academic_communities WHERE id = $1', [communityId]);
    if (checkMem.rowCount === 0 && req.user.role !== 'admin' && checkComm.rows[0]?.created_by !== userId) {
      return res.status(403).json({ message: 'Forbidden: Must be a member to view posts.' });
    }

    const postsSql = `
      SELECT p.*, 
             u.full_name as author_name, 
             u.avatar_url as author_avatar,
             u.role as author_role,
             (SELECT COUNT(*)::int FROM comments WHERE post_id = p.id) as comment_count,
             (SELECT COUNT(*)::int FROM likes WHERE post_id = p.id) as like_count,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.community_id = $2
      ORDER BY p.created_at DESC
    `;
    const result = await query(postsSql, [userId, communityId]);
    return res.status(200).json({ posts: result.rows });
  } catch (error) {
    console.error('Fetch posts error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Create Post
async function createPost(req, res) {
  try {
    const { title, content } = req.body;
    const communityId = parseInt(req.params.communityId);
    const userId = req.user.id;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required.' });
    }

    // Verify membership
    const checkMem = await query('SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, userId]);
    if (checkMem.rowCount === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Must be a community member to create posts.' });
    }

    const insertSql = `
      INSERT INTO posts (title, content, user_id, community_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const postRes = await query(insertSql, [title, content, userId, communityId]);
    const post = postRes.rows[0];

    // Fetch author details to append immediately in front-end
    const authorRes = await query('SELECT full_name, avatar_url, role FROM users WHERE id = $1', [userId]);
    post.author_name = authorRes.rows[0].full_name;
    post.author_avatar = authorRes.rows[0].avatar_url;
    post.author_role = authorRes.rows[0].role;
    post.comment_count = 0;
    post.like_count = 0;
    post.is_liked = false;

    // Send notifications to other community members in background
    const membersRes = await query('SELECT user_id FROM community_members WHERE community_id = $1 AND user_id != $2', [communityId, userId]);
    const communityNameRes = await query('SELECT name FROM academic_communities WHERE id = $1', [communityId]);
    const commName = communityNameRes.rows[0]?.name || 'Community';
    
    for (const row of membersRes.rows) {
      createUserNotification({
        userId: row.user_id,
        title: `New Post in ${commName}`,
        content: `${req.user.full_name} posted: "${title}"`,
        type: 'community',
        link: `/communities/${communityId}`
      });
    }

    return res.status(201).json({ message: 'Post created successfully', post });
  } catch (error) {
    console.error('Create post error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Like / Unlike Post toggle
async function toggleLikePost(req, res) {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.postId);

    const postQuery = await query('SELECT user_id, title, community_id FROM posts WHERE id = $1', [postId]);
    if (postQuery.rowCount === 0) {
      return res.status(404).json({ message: 'Post not found.' });
    }
    const post = postQuery.rows[0];

    const checkMem = await query('SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2', [post.community_id, userId]);
    if (checkMem.rowCount === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Must be a community member to like posts.' });
    }

    const likeCheck = await query('SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);

    if (likeCheck.rowCount > 0) {
      // Unlike
      await query('DELETE FROM likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
      return res.status(200).json({ message: 'Unliked post', isLiked: false });
    } else {
      // Like
      await query('INSERT INTO likes (post_id, user_id) VALUES ($1, $2)', [postId, userId]);
      
      // Notify author
      if (post.user_id !== userId) {
        createUserNotification({
          userId: post.user_id,
          title: 'Post Liked',
          content: `${req.user.full_name} liked your post "${post.title}"`,
          type: 'community',
          link: `/communities/${post.community_id}`
        });
      }
      return res.status(200).json({ message: 'Liked post', isLiked: true });
    }
  } catch (error) {
    console.error('Like toggle error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Get comments for post
async function getPostComments(req, res) {
  try {
    const postId = parseInt(req.params.postId);
    const postQuery = await query('SELECT community_id FROM posts WHERE id = $1', [postId]);
    if (postQuery.rowCount === 0) return res.status(404).json({ message: 'Post not found.' });
    
    const communityId = postQuery.rows[0].community_id;
    const userId = req.user.id;
    
    const checkMem = await query('SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, userId]);
    const checkComm = await query('SELECT created_by FROM academic_communities WHERE id = $1', [communityId]);
    if (checkMem.rowCount === 0 && req.user.role !== 'admin' && checkComm.rows[0]?.created_by !== userId) {
      return res.status(403).json({ message: 'Forbidden: Must be a member to view comments.' });
    }

    const sql = `
      SELECT c.*, u.full_name as author_name, u.avatar_url as author_avatar, u.role as author_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `;
    const result = await query(sql, [postId]);
    return res.status(200).json({ comments: result.rows });
  } catch (error) {
    console.error('Fetch comments error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Add Comment
async function addComment(req, res) {
  try {
    const { content } = req.body;
    const postId = parseInt(req.params.postId);
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ message: 'Comment content is required.' });
    }

    const postQuery = await query('SELECT user_id, title, community_id FROM posts WHERE id = $1', [postId]);
    if (postQuery.rowCount === 0) {
      return res.status(404).json({ message: 'Post not found.' });
    }
    const post = postQuery.rows[0];

    const checkMem = await query('SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2', [post.community_id, userId]);
    if (checkMem.rowCount === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Must be a community member to comment.' });
    }

    const insertSql = `
      INSERT INTO comments (post_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const commentRes = await query(insertSql, [postId, userId, content]);
    const comment = commentRes.rows[0];

    // Fetch author details
    const authorRes = await query('SELECT full_name, avatar_url, role FROM users WHERE id = $1', [userId]);
    comment.author_name = authorRes.rows[0].full_name;
    comment.author_avatar = authorRes.rows[0].avatar_url;
    comment.author_role = authorRes.rows[0].role;

    // Notify author
    if (post.user_id !== userId) {
      createUserNotification({
        userId: post.user_id,
        title: 'New Comment',
        content: `${req.user.full_name} commented on your post "${post.title}"`,
        type: 'community',
        link: `/communities/${post.community_id}`
      });
    }

    return res.status(201).json({ message: 'Comment added successfully', comment });
  } catch (error) {
    console.error('Add comment error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Delete Post
async function deletePost(req, res) {
  try {
    const postId = parseInt(req.params.postId);
    const userId = req.user.id;
    const userRole = req.user.role;

    const postQuery = await query('SELECT p.user_id, ac.created_by FROM posts p JOIN academic_communities ac ON p.community_id = ac.id WHERE p.id = $1', [postId]);
    if (postQuery.rowCount === 0) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const { user_id: postAuthorId, created_by: communityOwnerId } = postQuery.rows[0];

    // Only creator, community owner or admin can delete
    if (postAuthorId !== userId && communityOwnerId !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this post.' });
    }

    await query('DELETE FROM posts WHERE id = $1', [postId]);
    return res.status(200).json({ message: 'Post deleted successfully.' });
  } catch (error) {
    console.error('Delete post error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Delete Comment
async function deleteComment(req, res) {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user.id;
    const userRole = req.user.role;

    const commentQuery = await query(`
      SELECT c.user_id as comment_author_id, ac.created_by as community_owner_id
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      JOIN academic_communities ac ON p.community_id = ac.id
      WHERE c.id = $1
    `, [commentId]);

    if (commentQuery.rowCount === 0) {
       return res.status(404).json({ message: 'Comment not found.' });
    }

    const { comment_author_id, community_owner_id } = commentQuery.rows[0];

    if (comment_author_id !== userId && community_owner_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only the comment author or community owner can delete this comment.' });
    }

    await query('DELETE FROM comments WHERE id = $1', [commentId]);
    return res.status(200).json({ message: 'Comment deleted successfully.' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}


module.exports = {
  getAllCommunities,
  getCommunityById,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  removeMember,
  toggleJoinCommunity,
  inviteUser,
  getInvitations,
  respondToInvitation,
  getCommunityPosts,
  createPost,
  toggleLikePost,
  getPostComments,
  addComment,
  deletePost,
  deleteComment
};
