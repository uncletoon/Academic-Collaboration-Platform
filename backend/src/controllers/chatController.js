const { query } = require('../config/db');
const { broadcastChatMessage } = require('../config/socket');
const { createUserNotification } = require('../services/notificationService');

// Get all chat rooms for the current user
async function getChatRooms(req, res) {
  try {
    const userId = req.user.id;

    // Get rooms the user is part of, with member details and latest messages
    const sql = `
      SELECT cr.id, cr.name, cr.is_group, cr.created_at,
             (
               SELECT json_agg(json_build_object(
                 'id', u.id,
                 'full_name', u.full_name,
                 'role', u.role,
                 'avatar_url', u.avatar_url
               ))
               FROM chat_members cm
               JOIN users u ON cm.user_id = u.id
               WHERE cm.room_id = cr.id AND u.id != $1
             ) as other_members,
             (
               SELECT json_build_object(
                 'id', msg.id,
                 'message', msg.message,
                 'sender_id', msg.sender_id,
                 'created_at', msg.created_at
               )
               FROM chat_messages msg
               WHERE msg.room_id = cr.id
               ORDER BY msg.created_at DESC
               LIMIT 1
             ) as latest_message
      FROM chat_members cm_user
      JOIN chat_rooms cr ON cm_user.room_id = cr.id
      WHERE cm_user.user_id = $1
      ORDER BY (
        SELECT COALESCE(MAX(msg.created_at), cr.created_at) 
        FROM chat_messages msg 
        WHERE msg.room_id = cr.id
      ) DESC
    `;
    
    const result = await query(sql, [userId]);
    return res.status(200).json({ rooms: result.rows });
  } catch (error) {
    console.error('Fetch chat rooms error:', error);
    return res.status(500).json({ message: 'Internal server error fetching chat rooms.' });
  }
}

// Get messages for a specific room
async function getRoomMessages(req, res) {
  try {
    const userId = req.user.id;
    const roomId = parseInt(req.params.roomId);

    // Verify user membership in the room
    const verifyMem = await query('SELECT 1 FROM chat_members WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
    if (verifyMem.rowCount === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this chat room.' });
    }

    const sql = `
      SELECT cm.*, u.full_name as sender_name, u.avatar_url as sender_avatar, u.role as sender_role
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.room_id = $1
      ORDER BY cm.created_at ASC
    `;
    const result = await query(sql, [roomId]);
    return res.status(200).json({ messages: result.rows });
  } catch (error) {
    console.error('Fetch room messages error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Initiate or retrieve a Direct Message room with another user
async function getOrCreateDMRoom(req, res) {
  try {
    const currentUserId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required.' });
    }

    const partnerId = parseInt(targetUserId);

    if (currentUserId === partnerId) {
      return res.status(400).json({ message: 'Cannot open a direct message room with yourself.' });
    }

    // Check if DM room already exists
    const findDMSql = `
      SELECT cr.id 
      FROM chat_rooms cr
      JOIN chat_members cm1 ON cr.id = cm1.room_id AND cm1.user_id = $1
      JOIN chat_members cm2 ON cr.id = cm2.room_id AND cm2.user_id = $2
      WHERE cr.is_group = FALSE
      LIMIT 1
    `;
    const checkRes = await query(findDMSql, [currentUserId, partnerId]);

    if (checkRes.rowCount > 0) {
      return res.status(200).json({ roomId: checkRes.rows[0].id });
    }

    // Otherwise, create a new room
    const createRoomRes = await query('INSERT INTO chat_rooms (is_group) VALUES (FALSE) RETURNING id');
    const newRoomId = createRoomRes.rows[0].id;

    // Add members
    await query('INSERT INTO chat_members (room_id, user_id) VALUES ($1, $2), ($1, $3)', [
      newRoomId,
      currentUserId,
      partnerId
    ]);

    return res.status(201).json({ roomId: newRoomId });
  } catch (error) {
    console.error('Create DM room error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Create group chat room
async function createGroupRoom(req, res) {
  try {
    const currentUserId = req.user.id;
    const { name, memberIds } = req.body; // array of user IDs

    if (!name || !memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ message: 'Group name and member IDs array are required.' });
    }

    // Create room
    const createRoomRes = await query(
      'INSERT INTO chat_rooms (name, is_group) VALUES ($1, TRUE) RETURNING id',
      [name]
    );
    const newRoomId = createRoomRes.rows[0].id;

    // Insert creator
    await query('INSERT INTO chat_members (room_id, user_id) VALUES ($1, $2)', [newRoomId, currentUserId]);

    // Insert other members
    for (const mId of memberIds) {
      const parsedId = parseInt(mId);
      if (parsedId !== currentUserId) {
        await query('INSERT INTO chat_members (room_id, user_id) VALUES ($1, $2)', [newRoomId, parsedId]);
        
        // Notify members
        createUserNotification({
          userId: parsedId,
          title: `Added to "${name}"`,
          content: `${req.user.full_name || req.user.email || 'A user'} added you to the group chat "${name}".`,
          type: 'chat',
          link: `/chat?room=${newRoomId}`
        });
      }
    }

    return res.status(201).json({ roomId: newRoomId });
  } catch (error) {
    console.error('Create group chat room error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Send Message
async function sendMessage(req, res) {
  try {
    const currentUserId = req.user.id;
    const roomId = parseInt(req.params.roomId);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message content cannot be empty.' });
    }

    // Verify room member
    const verifyMem = await query('SELECT 1 FROM chat_members WHERE room_id = $1 AND user_id = $2', [roomId, currentUserId]);
    if (verifyMem.rowCount === 0) {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this chat room.' });
    }

    // Insert message
    const insertSql = `
      INSERT INTO chat_messages (room_id, sender_id, message)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const msgRes = await query(insertSql, [roomId, currentUserId, message]);
    const newMessage = msgRes.rows[0];

    // Fetch sender details
    const senderRes = await query('SELECT full_name, avatar_url, role FROM users WHERE id = $1', [currentUserId]);
    newMessage.sender_name = senderRes.rows[0].full_name;
    newMessage.sender_avatar = senderRes.rows[0].avatar_url;
    newMessage.sender_role = senderRes.rows[0].role;

    // Broadcast message via Socket.IO room helpers
    broadcastChatMessage(roomId, newMessage);

    // Notify other members of the room who aren't currently active
    const otherMembers = await query('SELECT user_id FROM chat_members WHERE room_id = $1 AND user_id != $2', [roomId, currentUserId]);
    const roomQuery = await query('SELECT name, is_group FROM chat_rooms WHERE id = $1', [roomId]);
    const room = roomQuery.rows[0];
    const senderName = newMessage.sender_name || req.user.email || 'A user';
    const sourceTitle = room.is_group ? `New message in "${room.name}"` : `New message from ${senderName}`;

    for (const member of otherMembers.rows) {
      createUserNotification({
        userId: member.user_id,
        title: sourceTitle,
        content: message.length > 50 ? `${message.substring(0, 50)}...` : message,
        type: 'chat',
        link: `/chat?room=${roomId}`
      });
    }

    return res.status(201).json({ message: 'Message sent successfully', chatMessage: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = {
  getChatRooms,
  getRoomMessages,
  getOrCreateDMRoom,
  createGroupRoom,
  sendMessage,
};
