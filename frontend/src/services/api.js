const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

// Create helper to fetch token from localStorage
const getAuthToken = () => localStorage.getItem('token');

// Custom Axios-like wrapper using standard fetch for lightweight, robust local development
const request = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const headers = {
    ...options.headers,
  };

  // Do not set Content-Type if uploading FormData (let browser set boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    cache: options.cache || 'no-store',
  });

  const contentType = response.headers.get('content-type') || '';
  const responseText = await response.text();
  let data = {};
  if (responseText && contentType.includes('application/json')) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`The server returned malformed JSON (${response.status}).`);
    }
  }

  if (!response.ok) {
    const error = new Error(data.message || `API request failed with status ${response.status}. Please restart the backend if routes were recently updated.`);
    error.status = response.status;
    throw error;
  }

  if (responseText && !contentType.includes('application/json')) {
    throw new Error('The API returned an unexpected response format. Please restart the backend server.');
  }

  return data;
};

const downloadProtectedFile = async (endpoint, filename, openInline = false) => {
  const token = getAuthToken();
  const previewWindow = openInline ? window.open('', '_blank') : null;
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Unable to access this file');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    if (openInline) {
      if (previewWindow) previewWindow.location.href = url;
      else window.location.assign(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
};

const api = {
  // Metadata
  getInstitutions: () => request('/meta/institutions'),
  getDepartments: (instId) => request(`/meta/departments/${instId}`),

  // Auth
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getProfile: (id) => request(id ? `/auth/profile/${id}` : '/auth/profile'),
  updateProfile: (formData) => request('/auth/profile', { method: 'PUT', body: formData }),
  getUsers: () => request('/auth/users'),

  // Communities
  getCommunities: () => request('/communities'),
  getCommunityDetails: (id) => request(`/communities/${id}`),
  createCommunity: (data) => request('/communities', { method: 'POST', body: JSON.stringify(data) }),
  updateCommunity: (id, data) => request(`/communities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCommunity: (id) => request(`/communities/${id}`, { method: 'DELETE' }),
  toggleJoinCommunity: (id) => request(`/communities/${id}/join`, { method: 'POST' }),
  inviteUser: (id, targetEmail) => request(`/communities/${id}/invite`, { method: 'POST', body: JSON.stringify({ targetEmail }) }),
  getInvitations: () => request('/communities/invitations'),
  respondToInvitation: (invitationId, action) => request(`/communities/invitations/${invitationId}/respond`, { method: 'POST', body: JSON.stringify({ action }) }),
  
  // Posts, comments, likes
  getCommunityPosts: (commId) => request(`/communities/${commId}/posts`),
  createPost: (commId, data) => request(`/communities/${commId}/posts`, { method: 'POST', body: JSON.stringify(data) }),
  toggleLikePost: (postId) => request(`/communities/posts/${postId}/like`, { method: 'POST' }),
  getPostComments: (postId) => request(`/communities/posts/${postId}/comments`),
  addComment: (postId, data) => request(`/communities/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) }),
  deleteComment: (commentId) => request(`/communities/posts/comments/${commentId}`, { method: 'DELETE' }),

  // Projects
  getProjects: () => request('/projects'),
  getProjectDetails: (id) => request(`/projects/${id}`),
  createProject: (formData) => request('/projects', { method: 'POST', body: formData }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  requestToJoinProject: (id) => request(`/projects/${id}/join-requests`, { method: 'POST' }),
  respondToProjectRequest: (id, requestId, action) => request(`/projects/${id}/join-requests/${requestId}/respond`, { method: 'POST', body: JSON.stringify({ action }) }),
  leaveProject: (id) => request(`/projects/${id}/membership`, { method: 'DELETE' }),
  removeProjectMember: (id, memberId) => request(`/projects/${id}/members/${memberId}`, { method: 'DELETE' }),
  uploadProjectFile: (id, formData) => request(`/projects/${id}/files`, { method: 'POST', body: formData }),
  readProjectFile: (id, file) => downloadProtectedFile(`/projects/${id}/files/${file.id}/download`, file.filename, true),
  downloadProjectFile: (id, file) => downloadProtectedFile(`/projects/${id}/files/${file.id}/download?download=1`, file.filename),
  deleteProjectFile: (id, fileId) => request(`/projects/${id}/files/${fileId}`, { method: 'DELETE' }),

  // Events
  getEvents: () => request('/events'),
  getEventDetails: (id) => request(`/events/${id}`),
  createEvent: (data) => request('/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id, data) => request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleEventRegistration: (id) => request(`/events/${id}/register`, { method: 'POST' }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),

  // News
  getNews: () => request('/news'),
  createNews: (formData) => request('/news', { method: 'POST', body: formData }),
  updateNews: (id, formData) => request(`/news/${id}`, { method: 'PUT', body: formData }),
  deleteNews: (id) => request(`/news/${id}`, { method: 'DELETE' }),
  deleteNewsDocument: (id, documentId) => request(`/news/${id}/documents/${documentId}`, { method: 'DELETE' }),
  downloadNewsDocument: (id, document) => downloadProtectedFile(`/news/${id}/documents/${document.id}/download`, document.filename),
  getAssetUrl: (storedPath) => {
    if (!storedPath) return '';
    if (/^https?:\/\//i.test(storedPath)) return storedPath;
    return `${API_URL.replace(/\/api\/?$/, '')}/${String(storedPath).replace(/^\//, '')}`;
  },

  // Chat
  getChatRooms: () => request('/chat/rooms'),
  getRoomMessages: (roomId) => request(`/chat/rooms/${roomId}/messages`),
  createDMRoom: (targetUserId) => request('/chat/rooms/dm', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
  createGroupRoom: (data) => request('/chat/rooms/group', { method: 'POST', body: JSON.stringify(data) }),
  sendMessage: (roomId, message) => request(`/chat/rooms/${roomId}/messages`, { method: 'POST', body: JSON.stringify({ message }) }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications', { method: 'PUT' }),

  // Global Search
  search: (queryStr) => request(`/search?q=${encodeURIComponent(queryStr)}`),

  // Admin Dashboard
  getAdminStats: () => request('/admin/stats'),
  getAdminUsers: () => request('/admin/users'),
  createAdminUser: (data) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminUser: (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleUserStatus: (userId) => request(`/admin/users/${userId}/status`, { method: 'PUT' }),
  changeUserRole: (userId, roleId) => request(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ roleId }) }),
  reviewInstitutionAdministrator: (userId, decision, notes = '') => request(`/admin/users/${userId}/approval`, { method: 'PUT', body: JSON.stringify({ decision, notes }) }),
  getAdminInstitutions: () => request('/admin/institutions'),
  createAdminInstitution: (data) => request('/admin/institutions', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminInstitution: (id, data) => request(`/admin/institutions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdminInstitution: (id) => request(`/admin/institutions/${id}`, { method: 'DELETE' }),
  getAdminDepartments: () => request('/admin/departments'),
  createAdminDepartment: (data) => request('/admin/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminDepartment: (id, data) => request(`/admin/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdminDepartment: (id) => request(`/admin/departments/${id}`, { method: 'DELETE' }),
  getAdminRoles: () => request('/admin/roles'),
  createAdminRole: (data) => request('/admin/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminRole: (id, data) => request(`/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdminRole: (id) => request(`/admin/roles/${id}`, { method: 'DELETE' }),
  getAdminAuditLogs: () => request('/admin/audit-logs'),
  getAdminCommunities: () => request('/admin/communities'),
  getAdminEvents: () => request('/admin/events'),
  adminDeleteCommunity: (id) => request(`/admin/communities/${id}`, { method: 'DELETE' }),
  adminDeleteEvent: (id) => request(`/admin/events/${id}`, { method: 'DELETE' }),
};

export default api;
