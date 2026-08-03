const { query } = require('../config/db');
const { normalizeNotification } = require('../services/notificationService');

// Get all notifications for user
async function getUserNotifications(req, res) {
  try {
    const userId = req.user.id;
    const sql = `
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 100
    `;
    const result = await query(sql, [userId]);
    return res.status(200).json({
      notifications: result.rows.map(normalizeNotification)
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ message: 'Internal server error fetching notifications.' });
  }
}

// Mark notification as read
async function markAsRead(req, res) {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id);

    const updateSql = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await query(updateSql, [notificationId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Notification not found or access denied.' });
    }

    return res.status(200).json({ message: 'Notification marked as read.', notification: result.rows[0] });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Mark all as read
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [userId]);
    return res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
