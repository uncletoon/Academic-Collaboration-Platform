const { query } = require('../config/db');
const { createUserNotification } = require('../services/notificationService');

// Get all events
async function getAllEvents(req, res) {
  try {
    const userId = req.user.id;
    const sql = `
      SELECT e.id, e.title, e.description, e.event_date, e.location, e.organizer_id,
             e.institution_id, e.capacity, e.created_at, e.updated_at,
             u.full_name as organizer_name,
             i.name as institution_name,
             (SELECT COUNT(*)::int FROM event_registrations WHERE event_id = e.id) as registered_count,
             EXISTS(SELECT 1 FROM event_registrations WHERE event_id = e.id AND user_id = $1) as is_registered,
             CASE
               WHEN $2 = 'admin' OR e.organizer_id = $1 OR EXISTS(
                 SELECT 1 FROM event_registrations WHERE event_id = e.id AND user_id = $1
               ) THEN e.meeting_link
               ELSE NULL
             END as meeting_link
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      LEFT JOIN institutions i ON e.institution_id = i.id
      WHERE $2 = 'admin'
         OR e.organizer_id = $1
         OR e.institution_id IS NULL
         OR e.institution_id = $3
      ORDER BY e.event_date ASC
    `;
    const result = await query(sql, [userId, req.user.role, req.user.institution_id]);
    return res.status(200).json({ events: result.rows });
  } catch (error) {
    console.error('Fetch events error:', error);
    return res.status(500).json({ message: 'Internal server error fetching events.' });
  }
}

// Get single event details
async function getEventById(req, res) {
  try {
    const userId = req.user.id;
    const eventId = parseInt(req.params.id);

    const eventSql = `
      SELECT e.id, e.title, e.description, e.event_date, e.location, e.organizer_id,
             e.institution_id, e.capacity, e.created_at, e.updated_at,
             u.full_name as organizer_name,
             i.name as institution_name,
             (SELECT COUNT(*)::int FROM event_registrations WHERE event_id = e.id) as registered_count,
             EXISTS(SELECT 1 FROM event_registrations WHERE event_id = e.id AND user_id = $1) as is_registered,
             CASE
               WHEN $3 = 'admin' OR e.organizer_id = $1 OR EXISTS(
                 SELECT 1 FROM event_registrations WHERE event_id = e.id AND user_id = $1
               ) THEN e.meeting_link
               ELSE NULL
             END as meeting_link
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      LEFT JOIN institutions i ON e.institution_id = i.id
      WHERE e.id = $2
        AND (
          $3 = 'admin'
          OR e.organizer_id = $1
          OR e.institution_id IS NULL
          OR e.institution_id = $4
        )
    `;
    const eventRes = await query(eventSql, [userId, eventId, req.user.role, req.user.institution_id]);
    if (eventRes.rowCount === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    const event = eventRes.rows[0];
    let attendees = [];
    if (Number(event.organizer_id) === Number(userId) || req.user.role === 'admin') {
      const attendeesSql = `
        SELECT u.id, u.full_name, u.email, u.role, u.avatar_url, er.registered_at
        FROM event_registrations er
        JOIN users u ON er.user_id = u.id
        WHERE er.event_id = $1
        ORDER BY er.registered_at ASC
      `;
      const attendeesRes = await query(attendeesSql, [eventId]);
      attendees = attendeesRes.rows;
    }

    return res.status(200).json({
      event,
      attendees
    });
  } catch (error) {
    console.error('Fetch event details error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Create event (Institution and System Administrators only)
async function createEvent(req, res) {
  try {
    const { title, description, eventDate, location, meetingLink, capacity, isInstitutional } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    if (!['institution_admin', 'admin'].includes(role)) {
      return res.status(403).json({ message: 'Only Institution Administrators and System Administrators can create events.' });
    }

    if (!title || !description || !eventDate) {
      return res.status(400).json({ message: 'Title, description, and date are required.' });
    }
    if (isInstitutional && !req.user.institution_id) {
      return res.status(400).json({ message: 'Add an institution to your profile before creating an institution-only event.' });
    }

    const institutionId = isInstitutional ? req.user.institution_id : null;

    const insertSql = `
      INSERT INTO events (title, description, event_date, location, meeting_link, organizer_id, institution_id, capacity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await query(insertSql, [
      title,
      description,
      new Date(eventDate),
      location?.trim() || 'Online',
      meetingLink?.trim() || null,
      userId,
      institutionId,
      capacity ? parseInt(capacity) : 100
    ]);
    const event = result.rows[0];

    // Fetch institution details if restricted
    let instName = 'All Institutions';
    if (institutionId) {
      const instQuery = await query('SELECT name FROM institutions WHERE id = $1', [institutionId]);
      instName = instQuery.rows[0]?.name || '';
    }

    // Broadcast notification to users in the same institution or all users
    const notifySql = institutionId 
      ? 'SELECT id FROM users WHERE institution_id = $1 AND id != $2'
      : 'SELECT id FROM users WHERE id != $1';
    
    const usersToNotify = institutionId 
      ? await query(notifySql, [institutionId, userId])
      : await query(notifySql, [userId]);

    for (const row of usersToNotify.rows) {
      createUserNotification({
        userId: row.id,
        title: `New event: "${title}"`,
        content: `A new event "${title}" was scheduled for ${new Date(eventDate).toLocaleDateString()} (${instName})`,
        type: 'event',
        link: `/events?id=${event.id}`
      });
    }

    return res.status(201).json({ message: 'Event created successfully', event });
  } catch (error) {
    console.error('Create event error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Update event (Organizer or Admin)
async function updateEvent(req, res) {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.user.id;
    const { title, description, eventDate, location, meetingLink, capacity, isInstitutional } = req.body;

    const eventQuery = await query('SELECT organizer_id, institution_id FROM events WHERE id = $1', [eventId]);
    if (eventQuery.rowCount === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }
    if (Number(eventQuery.rows[0].organizer_id) !== Number(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only the event creator or an administrator can update this event.' });
    }
    if (!title || !description || !eventDate) {
      return res.status(400).json({ message: 'Title, description, and date are required.' });
    }
    if (isInstitutional && req.user.role !== 'admin' && !req.user.institution_id) {
      return res.status(400).json({ message: 'Add an institution to your profile before restricting this event.' });
    }
    if (isInstitutional && req.user.role === 'admin' && !eventQuery.rows[0].institution_id) {
      return res.status(400).json({ message: 'This event has no institution to restrict access to.' });
    }

    const institutionId = isInstitutional
      ? (req.user.role === 'admin' ? eventQuery.rows[0].institution_id : req.user.institution_id)
      : null;
    const result = await query(
      `UPDATE events
       SET title = $1, description = $2, event_date = $3, location = $4,
           meeting_link = $5, capacity = $6, institution_id = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        title,
        description,
        new Date(eventDate),
        location?.trim() || 'Online',
        meetingLink?.trim() || null,
        capacity ? parseInt(capacity) : 100,
        institutionId,
        eventId,
      ]
    );

    return res.status(200).json({ message: 'Event updated successfully.', event: result.rows[0] });
  } catch (error) {
    console.error('Update event error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Register / Cancel registration toggle
async function toggleEventRegistration(req, res) {
  try {
    const userId = req.user.id;
    const eventId = parseInt(req.params.id);

    const eventQuery = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventQuery.rowCount === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }
    const event = eventQuery.rows[0];

    // Check institutional restriction
    if (
      req.user.role !== 'admin' &&
      event.institution_id &&
      Number(event.institution_id) !== Number(req.user.institution_id)
    ) {
      return res.status(403).json({ message: 'Forbidden: This event is restricted to members of the hosting institution.' });
    }

    const regCheck = await query(
      'SELECT 1 FROM event_registrations WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );

    if (regCheck.rowCount > 0) {
      // Cancel
      await query('DELETE FROM event_registrations WHERE event_id = $1 AND user_id = $2', [eventId, userId]);
      return res.status(200).json({ message: 'Registration cancelled successfully', isRegistered: false });
    } else {
      // Register (Check capacity)
      const countRes = await query('SELECT COUNT(*)::int FROM event_registrations WHERE event_id = $1', [eventId]);
      const currentAttendees = countRes.rows[0].count;

      if (currentAttendees >= event.capacity) {
        return res.status(400).json({ message: 'Registration failed: Event is fully booked.' });
      }

      await query('INSERT INTO event_registrations (event_id, user_id) VALUES ($1, $2)', [eventId, userId]);
      
      // Notify organizer
      if (event.organizer_id && event.organizer_id !== userId) {
        createUserNotification({
          userId: event.organizer_id,
          title: `New registration for "${event.title}"`,
          content: `${req.user.full_name || req.user.email || 'A user'} registered for your event: "${event.title}".`,
          type: 'event',
          link: `/events?id=${eventId}`
        });
      }

      return res.status(200).json({ message: 'Registered successfully', isRegistered: true });
    }
  } catch (error) {
    console.error('Toggle event registration error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Delete Event (Organizer or Admin only)
async function deleteEvent(req, res) {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.user.id;

    const eventQuery = await query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
    if (eventQuery.rowCount === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (eventQuery.rows[0].organizer_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only the organizer can delete this event.' });
    }

    await query('DELETE FROM events WHERE id = $1', [eventId]);
    return res.status(200).json({ message: 'Event deleted successfully.' });
  } catch (error) {
    console.error('Delete event error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  toggleEventRegistration,
  deleteEvent,
};
