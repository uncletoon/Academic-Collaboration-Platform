const API_URL = 'http://127.0.0.1:5000/api';

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
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
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
  removeMember: (id, userId) => request(`/communities/${id}/members/${userId}`, { method: 'DELETE' }),
  inviteUser: (id, targetEmail) => request(`/communities/${id}/invite`, { method: 'POST', body: JSON.stringify({ targetEmail }) }),
  getInvitations: () => request('/communities/invitations'),
  respondToInvitation: (invitationId, action) => request(`/communities/invitations/${invitationId}/respond`, { method: 'POST', body: JSON.stringify({ action }) }),
  
  // Posts, comments, likes
  getCommunityPosts: (commId) => request(`/communities/${commId}/posts`),
  createPost: (commId, data) => request(`/communities/${commId}/posts`, { method: 'POST', body: JSON.stringify(data) }),
  deletePost: (postId) => request(`/communities/posts/${postId}`, { method: 'DELETE' }),
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

  // Research
  getResearch: () => request('/research'),
  uploadResearch: (formData) => request('/research', { method: 'POST', body: formData }),
  getDownloadUrl: (id) => `${API_URL}/research/${id}/download`,
  deleteResearch: (id) => request(`/research/${id}`, { method: 'DELETE' }),

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
  toggleUserStatus: (userId) => request(`/admin/users/${userId}/status`, { method: 'PUT' }),
  changeUserRole: (userId, newRole) => request(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ newRole }) }),
  adminDeleteCommunity: (id) => request(`/admin/communities/${id}`, { method: 'DELETE' }),
  adminDeleteEvent: (id) => request(`/admin/events/${id}`, { method: 'DELETE' }),
};

export default api;
