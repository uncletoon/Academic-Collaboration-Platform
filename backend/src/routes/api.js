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
const researchCtrl = require('../controllers/researchController');
const chatCtrl = require('../controllers/chatController');
const notifCtrl = require('../controllers/notificationController');
const searchCtrl = require('../controllers/searchController');
const adminCtrl = require('../controllers/adminController');

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
router.post('/projects', projCtrl.createProject);
router.get('/projects/:id', projCtrl.getProjectById);
router.put('/projects/:id', projCtrl.updateProject);
router.post('/projects/:id/members', projCtrl.addProjectMember);
router.delete('/projects/:id/members/:memberId', projCtrl.removeProjectMember);
router.post('/projects/:id/files', upload.single('projectFile'), projCtrl.uploadProjectFile);
router.delete('/projects/:id/files/:fileId', projCtrl.deleteProjectFile);

// --- 5. Academic Events Routes ---
router.get('/events', eventCtrl.getAllEvents);
router.post('/events', eventCtrl.createEvent);
router.get('/events/:id', eventCtrl.getEventById);
router.post('/events/:id/register', eventCtrl.toggleEventRegistration);
router.delete('/events/:id', eventCtrl.deleteEvent);

// --- 6. Research Repository Routes ---
router.get('/research', researchCtrl.getAllResearch);
router.post('/research', upload.single('researchPaper'), researchCtrl.uploadResearchPaper);
router.get('/research/:id/download', researchCtrl.downloadResearchPaper);
router.delete('/research/:id', researchCtrl.deleteResearchPaper);

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
router.use(authorizeRoles('admin'));

router.get('/admin/stats', adminCtrl.getAdminStats);
router.get('/admin/users', adminCtrl.getAllUsersDetailed);
router.put('/admin/users/:userId/status', adminCtrl.toggleUserStatus);
router.put('/admin/users/:userId/role', adminCtrl.changeUserRole);
router.delete('/admin/communities/:id', adminCtrl.adminDeleteCommunity);
router.delete('/admin/events/:id', adminCtrl.adminDeleteEvent);

module.exports = router;
