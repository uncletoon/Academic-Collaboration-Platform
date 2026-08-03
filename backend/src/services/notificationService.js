const { query } = require('../config/db');
const { sendNotification } = require('../config/socket');

const fallbackTitles = {
  chat: 'Chat update',
  community: 'Community update',
  event: 'Event update',
  project: 'Collaboration update',
  system: 'System update',
};

function sanitizeNotificationText(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return fallback;

  return text
    .replace(/\bundefined\b/gi, (match, offset) => (offset === 0 ? 'A user' : 'a user'))
    .replace(/\bnull\b/gi, 'details unavailable');
}

function normalizeNotification(notification) {
  const type = notification.type || 'system';
  return {
    ...notification,
    title: sanitizeNotificationText(notification.title, fallbackTitles[type] || 'Notification'),
    content: sanitizeNotificationText(notification.content, 'There is a new update for you.'),
  };
}

// Create a user notification in database and trigger Socket.IO emit
async function createUserNotification({ userId, title, content, type, link }) {
  try {
    const normalized = normalizeNotification({ title, content, type, link });
    const insertQuery = `
      INSERT INTO notifications (user_id, title, content, type, link)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await query(insertQuery, [
      parseInt(userId),
      normalized.title,
      normalized.content,
      normalized.type,
      normalized.link || null
    ]);

    const notification = result.rows[0];

    // Broadcast through socket helper
    sendNotification(userId, notification);

    return notification;
  } catch (error) {
    console.error('Error creating user notification:', error);
  }
}

module.exports = {
  createUserNotification,
  normalizeNotification,
};
