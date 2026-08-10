const express = require('express');
const router = express.Router();

// Middlewares
const { authenticateToken, authorizeRoles, checkUserActive } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Controllers
const authCtrl = require('../controllers/authController');
const metaCtrl = require('../controllers/institutionController');
const commCtrl = require('../controllers/communityController');
const projCtrl = require('../controllers/projectController');
const eventCtrl = require('../controllers/eventController');
const newsCtrl = require('../controllers/newsController');
const chatCtrl = require('../controllers/chatController');
const notifCtrl = require('../controllers/notificationController');
const searchCtrl = require('../controllers/searchController');
const adminCtrl = require('../controllers/adminController');
const adminDirectoryCtrl = require('../controllers/adminDirectoryController');

// --- 1. Public Metadata Routes ---
router.get('/meta/institutions', metaCtrl.getAllInstitutions);
router.get('/meta/departments/:institutionId', metaCtrl.getDepartmentsByInstitution);

// --- 2. Auth Routes ---
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);

// Secure routes (must have token + account must be active)
router.use(authenticateToken);
router.use(checkUserActive);

router.get('/auth/profile', authCtrl.getProfile);
router.get('/auth/profile/:id', authCtrl.getProfile);
router.put('/auth/profile', upload.single('avatar'), authCtrl.updateProfile);
router.get('/auth/users', authCtrl.getUsers);

// --- 3. Academic Communities Routes ---
router.get('/communities/invitations', commCtrl.getInvitations);
router.post('/communities/invitations/:invitationId/respond', commCtrl.respondToInvitation);

router.get('/communities', commCtrl.getAllCommunities);
router.post('/communities', commCtrl.createCommunity);
router.get('/communities/:id', commCtrl.getCommunityById);
router.put('/communities/:id', commCtrl.updateCommunity);
router.delete('/communities/:id', commCtrl.deleteCommunity);
router.post('/communities/:id/join', commCtrl.toggleJoinCommunity);
router.post('/communities/:id/invite', commCtrl.inviteUser);
router.delete('/communities/:id/members/:userId', commCtrl.removeMember);

router.get('/communities/:communityId/posts', commCtrl.getCommunityPosts);
router.post('/communities/:communityId/posts', commCtrl.createPost);
router.delete('/communities/posts/:postId', commCtrl.deletePost);
router.post('/communities/posts/:postId/like', commCtrl.toggleLikePost);

router.get('/communities/posts/:postId/comments', commCtrl.getPostComments);
router.post('/communities/posts/:postId/comments', commCtrl.addComment);
router.delete('/communities/posts/comments/:commentId', commCtrl.deleteComment);

// --- 4. Projects Routes ---
router.get('/projects', projCtrl.getUserProjects);
router.post('/projects', upload.array('supportiveDocuments', 8), projCtrl.createProject);
router.get('/projects/:id', projCtrl.getProjectById);
router.put('/projects/:id', projCtrl.updateProject);
router.delete('/projects/:id', projCtrl.deleteProject);
router.post('/projects/:id/join-requests', projCtrl.requestToJoin);
router.post('/projects/:id/join-requests/:requestId/respond', projCtrl.respondToJoinRequest);
router.delete('/projects/:id/membership', projCtrl.leaveProject);
router.delete('/projects/:id/members/:memberId', projCtrl.removeProjectMember);
router.post('/projects/:id/files', upload.single('projectFile'), projCtrl.uploadProjectFile);
router.get('/projects/:id/files/:fileId/download', projCtrl.downloadProjectFile);
router.delete('/projects/:id/files/:fileId', projCtrl.deleteProjectFile);

// --- 5. Academic Events Routes ---
router.get('/events', eventCtrl.getAllEvents);
router.post('/events', authorizeRoles('admin', 'institution_admin'), eventCtrl.createEvent);
router.get('/events/:id', eventCtrl.getEventById);
router.put('/events/:id', eventCtrl.updateEvent);
router.post('/events/:id/register', eventCtrl.toggleEventRegistration);
router.delete('/events/:id', eventCtrl.deleteEvent);

// --- 6. Public News Routes (all mutations are administrator-only) ---
const newsUpload = upload.fields([
  { name: 'featureImage', maxCount: 1 },
  { name: 'supportiveDocuments', maxCount: 8 },
]);
router.get('/news', newsCtrl.getAllNews);
router.post('/news', authorizeRoles('admin', 'institution_admin'), newsUpload, newsCtrl.createNews);
router.put('/news/:id', authorizeRoles('admin', 'institution_admin'), newsUpload, newsCtrl.updateNews);
router.delete('/news/:id', authorizeRoles('admin', 'institution_admin'), newsCtrl.deleteNews);
router.delete('/news/:id/documents/:documentId', authorizeRoles('admin', 'institution_admin'), newsCtrl.deleteNewsDocument);
router.get('/news/:id/documents/:documentId/download', newsCtrl.downloadNewsDocument);

// --- 7. Real-Time Chat Routes ---
router.get('/chat/rooms', chatCtrl.getChatRooms);
router.post('/chat/rooms/dm', chatCtrl.getOrCreateDMRoom);
router.post('/chat/rooms/group', chatCtrl.createGroupRoom);
router.get('/chat/rooms/:roomId/messages', chatCtrl.getRoomMessages);
router.post('/chat/rooms/:roomId/messages', chatCtrl.sendMessage);

// --- 8. Real-Time Notifications Routes ---
router.get('/notifications', notifCtrl.getUserNotifications);
router.put('/notifications', notifCtrl.markAllAsRead);
router.put('/notifications/:id', notifCtrl.markAsRead);

// --- 9. Global Search Route ---
router.get('/search', searchCtrl.globalSearch);

// --- 10. Administrator Dashboard Routes (Admin Access Only) ---
// Keep authorization route-scoped so an unmatched application route returns 404
// instead of falling through to a misleading admin-only error.
const authorizeAdminPanel = authorizeRoles('admin', 'institution_admin');
router.get('/admin/stats', authorizeAdminPanel, adminCtrl.getAdminStats);
router.get('/admin/users', authorizeAdminPanel, adminCtrl.getAllUsersDetailed);
router.post('/admin/users', authorizeAdminPanel, adminCtrl.createUser);
router.put('/admin/users/:userId', authorizeAdminPanel, adminCtrl.updateUser);
router.put('/admin/users/:userId/status', authorizeAdminPanel, adminCtrl.toggleUserStatus);
router.put('/admin/users/:userId/role', authorizeAdminPanel, adminCtrl.changeUserRole);
router.put('/admin/users/:userId/approval', authorizeRoles('admin'), adminCtrl.reviewInstitutionAdministrator);
router.get('/admin/institutions', authorizeAdminPanel, adminDirectoryCtrl.getInstitutions);
router.post('/admin/institutions', authorizeRoles('admin'), adminDirectoryCtrl.createInstitution);
router.put('/admin/institutions/:id', authorizeRoles('admin'), adminDirectoryCtrl.updateInstitution);
router.delete('/admin/institutions/:id', authorizeRoles('admin'), adminDirectoryCtrl.deleteInstitution);
router.get('/admin/departments', authorizeAdminPanel, adminDirectoryCtrl.getDepartments);
router.post('/admin/departments', authorizeAdminPanel, adminDirectoryCtrl.createDepartment);
router.put('/admin/departments/:id', authorizeAdminPanel, adminDirectoryCtrl.updateDepartment);
router.delete('/admin/departments/:id', authorizeAdminPanel, adminDirectoryCtrl.deleteDepartment);
router.get('/admin/roles', authorizeAdminPanel, adminDirectoryCtrl.getRoles);
router.post('/admin/roles', authorizeAdminPanel, adminDirectoryCtrl.createRole);
router.put('/admin/roles/:id', authorizeAdminPanel, adminDirectoryCtrl.updateRole);
router.delete('/admin/roles/:id', authorizeAdminPanel, adminDirectoryCtrl.deleteRole);
router.get('/admin/audit-logs', authorizeAdminPanel, adminDirectoryCtrl.getAuditLogs);
router.get('/admin/communities', authorizeAdminPanel, adminCtrl.getModerationCommunities);
router.get('/admin/events', authorizeAdminPanel, adminCtrl.getModerationEvents);
router.delete('/admin/communities/:id', authorizeAdminPanel, adminCtrl.adminDeleteCommunity);
router.delete('/admin/events/:id', authorizeAdminPanel, adminCtrl.adminDeleteEvent);

module.exports = router;
