import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Inbox,
  LoaderCircle,
  MessageCircle,
  MessageSquarePlus,
  Plus,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const API_ORIGIN = 'http://localhost:5000';

const getErrorMessage = (error, fallback) =>
  error?.message || error?.response?.data?.message || fallback;

const sameId = (first, second) => String(first) === String(second);

const formatTime = (date) => {
  if (!date) return '';

  return new Intl.DateTimeFormat([], {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
};

const formatRoomTime = (date) => {
  if (!date) return '';

  const messageDate = new Date(date);
  const today = new Date();
  const sameDay = messageDate.toDateString() === today.toDateString();

  if (sameDay) return formatTime(date);

  return new Intl.DateTimeFormat([], {
    month: 'short',
    day: 'numeric',
  }).format(messageDate);
};

const initialsFor = (name = 'Discussion') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const resolveAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  return `${API_ORIGIN}${avatarUrl}`;
};

const Avatar = ({ name, src, group = false, size = 'md', className = '' }) => {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = resolveAvatarUrl(src);

  return (
    <span
      className={`discussion-avatar discussion-avatar--${size} ${
        group ? 'discussion-avatar--group' : ''
      } ${className}`}
      aria-hidden="true"
    >
      {resolvedSrc && !failed ? (
        <img src={resolvedSrc} alt="" onError={() => setFailed(true)} />
      ) : group ? (
        <Users />
      ) : (
        <span>{initialsFor(name)}</span>
      )}
    </span>
  );
};

const ChatSkeleton = () => (
  <div className="discussion-skeleton" aria-label="Loading conversations">
    {[0, 1, 2, 3].map((item) => (
      <div className="discussion-skeleton__row" key={item}>
        <span />
        <div>
          <i />
          <i />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="discussion-empty">
    <span className="discussion-empty__icon">
      <Icon aria-hidden="true" />
    </span>
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>
);

const Modal = ({ eyebrow, title, description, onClose, children }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="discussion-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="discussion-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discussion-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="discussion-modal__header">
          <div>
            <p>{eyebrow}</p>
            <h2 id="discussion-modal-title">{title}</h2>
            {description && <span>{description}</span>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog">
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
};

const Chat = () => {
  const { user } = useAuth();
  const socket = useSocket();

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [roomQuery, setRoomQuery] = useState('');
  const [peopleQuery, setPeopleQuery] = useState('');
  const [unreadByRoom, setUnreadByRoom] = useState({});

  const [roomsLoading, setRoomsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingTargetId, setCreatingTargetId] = useState(null);
  const [error, setError] = useState('');

  const [showDMModal, setShowDMModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [systemUsers, setSystemUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  const messagesViewportRef = useRef(null);
  const composerRef = useRef(null);
  const selectedRoomRef = useRef(null);
  const roomIdsRef = useRef([]);

  const getRoomName = useCallback((room) => {
    if (!room) return '';
    if (room.is_group) return room.name || 'Untitled group';
    return room.other_members?.[0]?.full_name || 'Direct message';
  }, []);

  const getRoomMeta = useCallback((room) => {
    if (!room) return '';
    if (room.is_group) {
      const otherCount = room.other_members?.length || 0;
      const total = otherCount + 1;
      return `${total} member${total === 1 ? '' : 's'}`;
    }
    return room.other_members?.[0]?.role || 'Member';
  }, []);

  const getRoomAvatar = useCallback(
    (room) => (room?.is_group ? null : room?.other_members?.[0]?.avatar_url),
    [],
  );

  const appendUniqueMessage = useCallback((message) => {
    setMessages((current) => {
      if (current.some((item) => sameId(item.id, message.id))) return current;
      return [...current, message];
    });
  }, []);

  const loadRooms = useCallback(
    async ({ quiet = false, selectRoomId = null } = {}) => {
      if (!quiet) setRoomsLoading(true);
      try {
        const response = await api.getChatRooms();
        const nextRooms = response.rooms || [];
        setRooms(nextRooms);
        setError('');

        setSelectedRoom((current) => {
          const targetId = selectRoomId || current?.id;
          if (!targetId) return current;
          return nextRooms.find((room) => sameId(room.id, targetId)) || current;
        });

        return nextRooms;
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'We could not load your conversations.'));
        return [];
      } finally {
        if (!quiet) setRoomsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const roomId = new URLSearchParams(window.location.search).get('room');
    loadRooms({ selectRoomId: roomId });
  }, [loadRooms]);

  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
  }, [selectedRoom]);

  useEffect(() => {
    if (!socket) return undefined;

    const nextIds = rooms.map((room) => String(room.id));
    const previousIds = roomIdsRef.current;

    nextIds
      .filter((id) => !previousIds.includes(id))
      .forEach((id) => socket.emit('join_chat_room', id));
    previousIds
      .filter((id) => !nextIds.includes(id))
      .forEach((id) => socket.emit('leave_chat_room', id));

    roomIdsRef.current = nextIds;
    return undefined;
  }, [rooms, socket]);

  useEffect(
    () => () => {
      if (!socket) return;
      roomIdsRef.current.forEach((id) => socket.emit('leave_chat_room', id));
    },
    [socket],
  );

  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      return undefined;
    }

    let active = true;
    setMessagesLoading(true);
    setError('');
    setUnreadByRoom((current) => ({ ...current, [selectedRoom.id]: 0 }));

    api
      .getRoomMessages(selectedRoom.id)
      .then((response) => {
        if (active) setMessages(response.messages || []);
      })
      .catch((loadError) => {
        if (active) {
          setError(getErrorMessage(loadError, 'We could not load this discussion.'));
        }
      })
      .finally(() => {
        if (active) setMessagesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedRoom?.id]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleIncomingMessage = (chatMessage) => {
      const activeRoom = selectedRoomRef.current;
      const isActiveRoom = activeRoom && sameId(chatMessage.room_id, activeRoom.id);

      if (isActiveRoom) {
        appendUniqueMessage(chatMessage);
      } else if (!sameId(chatMessage.sender_id, user?.id)) {
        setUnreadByRoom((current) => ({
          ...current,
          [chatMessage.room_id]: (current[chatMessage.room_id] || 0) + 1,
        }));
      }

      setRooms((current) => {
        const roomIndex = current.findIndex((room) => sameId(room.id, chatMessage.room_id));
        if (roomIndex < 0) {
          loadRooms({ quiet: true });
          return current;
        }

        const updated = {
          ...current[roomIndex],
          latest_message: chatMessage,
        };
        return [updated, ...current.filter((_, index) => index !== roomIndex)];
      });
    };

    socket.on('chat_message', handleIncomingMessage);
    return () => socket.off('chat_message', handleIncomingMessage);
  }, [appendUniqueMessage, loadRooms, socket, user?.id]);

  useEffect(() => {
    if (!messagesLoading) {
      const viewport = messagesViewportRef.current;
      viewport?.scrollTo({
        top: viewport.scrollHeight,
        behavior: messages.length > 1 ? 'smooth' : 'auto',
      });
    }
  }, [messages, messagesLoading]);

  useEffect(() => {
    if (selectedRoom && !messagesLoading) composerRef.current?.focus();
  }, [selectedRoom?.id, messagesLoading]);

  const filteredRooms = useMemo(() => {
    const query = roomQuery.trim().toLowerCase();
    if (!query) return rooms;

    return rooms.filter((room) => {
      const searchable = [
        getRoomName(room),
        getRoomMeta(room),
        room.latest_message?.message,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [getRoomMeta, getRoomName, roomQuery, rooms]);

  const availableUsers = useMemo(() => {
    const query = peopleQuery.trim().toLowerCase();
    return systemUsers.filter((person) => {
      if (sameId(person.id, user?.id)) return false;
      if (!query) return true;
      return [person.full_name, person.role, person.institution_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [peopleQuery, systemUsers, user?.id]);

  const selectRoom = (room) => {
    setSelectedRoom(room);
    setUnreadByRoom((current) => ({ ...current, [room.id]: 0 }));
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const message = inputMessage.trim();
    if (!message || !selectedRoom || sending) return;

    setSending(true);
    setError('');

    try {
      const response = await api.sendMessage(selectedRoom.id, message);
      if (response.chatMessage) appendUniqueMessage(response.chatMessage);
      setInputMessage('');
      setRooms((current) =>
        current.map((room) =>
          sameId(room.id, selectedRoom.id)
            ? { ...room, latest_message: response.chatMessage }
            : room,
        ),
      );
    } catch (sendError) {
      setError(getErrorMessage(sendError, 'Your message was not sent. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const loadPeople = async () => {
    setPeopleLoading(true);
    setError('');
    try {
      const response = await api.getUsers();
      setSystemUsers(response.users || []);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'We could not load collaborators.'));
    } finally {
      setPeopleLoading(false);
    }
  };

  const openNewDMSelector = () => {
    setPeopleQuery('');
    setShowDMModal(true);
    loadPeople();
  };

  const openGroupSelector = () => {
    setPeopleQuery('');
    setShowGroupModal(true);
    loadPeople();
  };

  const startDMRoom = async (targetUserId) => {
    if (creating) return;
    setCreating(true);
    setCreatingTargetId(targetUserId);
    setError('');
    try {
      const response = await api.createDMRoom(targetUserId);
      const nextRooms = await loadRooms({ quiet: true, selectRoomId: response.roomId });
      const room = nextRooms.find((item) => sameId(item.id, response.roomId));
      if (room) selectRoom(room);
      setShowDMModal(false);
    } catch (createError) {
      setError(getErrorMessage(createError, 'We could not start this conversation.'));
    } finally {
      setCreating(false);
      setCreatingTargetId(null);
    }
  };

  const toggleGroupMember = (userId) => {
    setSelectedUserIds((current) =>
      current.some((id) => sameId(id, userId))
        ? current.filter((id) => !sameId(id, userId))
        : [...current, userId],
    );
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    setGroupName('');
    setSelectedUserIds([]);
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0 || creating) return;

    setCreating(true);
    setError('');
    try {
      const response = await api.createGroupRoom({
        name: groupName.trim(),
        memberIds: selectedUserIds,
      });
      const nextRooms = await loadRooms({ quiet: true, selectRoomId: response.roomId });
      const room = nextRooms.find((item) => sameId(item.id, response.roomId));
      if (room) selectRoom(room);
      closeGroupModal();
    } catch (createError) {
      setError(getErrorMessage(createError, 'We could not create the group.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="discussion-shell animate-fade-in" aria-label="Discussions">
      {error && (
        <div className="discussion-toast" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            <X aria-hidden="true" />
          </button>
        </div>
      )}

      <aside className={`discussion-sidebar ${selectedRoom ? 'discussion-sidebar--hidden-mobile' : ''}`}>
        <header className="discussion-sidebar__header">
          <div>
            <p className="discussion-eyebrow">Workspace</p>
            <h1>Discussions</h1>
            <span>Ideas move faster together.</span>
          </div>
          <div className="discussion-header-actions">
            <button type="button" onClick={openNewDMSelector} aria-label="Start a direct message">
              <MessageSquarePlus aria-hidden="true" />
            </button>
            <button type="button" onClick={openGroupSelector} aria-label="Create a discussion group">
              <Users aria-hidden="true" />
            </button>
          </div>
        </header>

        <label className="discussion-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search discussions</span>
          <input
            type="search"
            value={roomQuery}
            onChange={(event) => setRoomQuery(event.target.value)}
            placeholder="Search discussions"
          />
          {roomQuery && (
            <button type="button" onClick={() => setRoomQuery('')} aria-label="Clear search">
              <X aria-hidden="true" />
            </button>
          )}
        </label>

        <div className="discussion-list" aria-live="polite">
          {roomsLoading ? (
            <ChatSkeleton />
          ) : filteredRooms.length === 0 ? (
            <EmptyState
              icon={roomQuery ? Search : Inbox}
              title={roomQuery ? 'No matches found' : 'Start the first conversation'}
              description={
                roomQuery
                  ? 'Try a name, role, or a phrase from a message.'
                  : 'Connect one-to-one or bring a research group together.'
              }
              action={
                !roomQuery && (
                  <button type="button" className="discussion-text-action" onClick={openNewDMSelector}>
                    Start a discussion <ChevronRight aria-hidden="true" />
                  </button>
                )
              }
            />
          ) : (
            filteredRooms.map((room) => {
              const active = selectedRoom && sameId(selectedRoom.id, room.id);
              const unread = unreadByRoom[room.id] || 0;
              const latest = room.latest_message;

              return (
                <button
                  type="button"
                  key={room.id}
                  className={`discussion-room ${active ? 'discussion-room--active' : ''}`}
                  onClick={() => selectRoom(room)}
                  aria-current={active ? 'true' : undefined}
                >
                  <Avatar
                    name={getRoomName(room)}
                    src={getRoomAvatar(room)}
                    group={room.is_group}
                    size="lg"
                  />
                  <span className="discussion-room__content">
                    <span className="discussion-room__topline">
                      <strong>{getRoomName(room)}</strong>
                      <time>{formatRoomTime(latest?.created_at)}</time>
                    </span>
                    <span className="discussion-room__preview">
                      <span>
                        {latest?.message ? (
                          <>
                            {sameId(latest.sender_id, user?.id) && <b>You: </b>}
                            {latest.message}
                          </>
                        ) : (
                          getRoomMeta(room)
                        )}
                      </span>
                      {unread > 0 && <i aria-label={`${unread} unread messages`}>{Math.min(unread, 9)}</i>}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <footer className="discussion-sidebar__footer">
          <span className={`discussion-live-dot ${socket?.connected ? 'is-live' : ''}`} />
          {socket?.connected ? 'Live updates connected' : 'Reconnecting to live updates'}
        </footer>
      </aside>

      <main className={`discussion-workspace ${selectedRoom ? 'discussion-workspace--active' : ''}`}>
        {selectedRoom ? (
          <>
            <header className="discussion-thread-header">
              <button
                type="button"
                className="discussion-back"
                onClick={() => setSelectedRoom(null)}
                aria-label="Back to discussions"
              >
                <ArrowLeft aria-hidden="true" />
              </button>
              <Avatar
                name={getRoomName(selectedRoom)}
                src={getRoomAvatar(selectedRoom)}
                group={selectedRoom.is_group}
                size="md"
              />
              <div>
                <h2>{getRoomName(selectedRoom)}</h2>
                <p>
                  <span className={`discussion-live-dot ${socket?.connected ? 'is-live' : ''}`} />
                  {getRoomMeta(selectedRoom)} · {socket?.connected ? 'live' : 'reconnecting'}
                </p>
              </div>
            </header>

            <div
              ref={messagesViewportRef}
              className="discussion-messages"
              aria-live="polite"
              aria-busy={messagesLoading}
            >
              {messagesLoading ? (
                <div className="discussion-message-loading">
                  <LoaderCircle aria-hidden="true" />
                  <span>Opening discussion…</span>
                </div>
              ) : messages.length === 0 ? (
                <EmptyState
                  icon={MessageCircle}
                  title={`Begin with ${getRoomName(selectedRoom)}`}
                  description="Share a question, an update, or the idea that gets the work moving."
                />
              ) : (
                <div className="discussion-message-stack">
                  <div className="discussion-date-divider">
                    <span>Recent messages</span>
                  </div>
                  {messages.map((message, index) => {
                    const own = sameId(message.sender_id, user?.id);
                    const previous = messages[index - 1];
                    const grouped =
                      previous &&
                      sameId(previous.sender_id, message.sender_id) &&
                      new Date(message.created_at) - new Date(previous.created_at) < 5 * 60 * 1000;

                    return (
                      <article
                        key={message.id}
                        className={`discussion-message ${own ? 'discussion-message--own' : ''} ${
                          grouped ? 'discussion-message--grouped' : ''
                        }`}
                      >
                        {!grouped && (
                          <Avatar
                            name={message.sender_name}
                            src={message.sender_avatar}
                            size="sm"
                            className="discussion-message__avatar"
                          />
                        )}
                        <div className="discussion-message__body">
                          {!grouped && (
                            <div className="discussion-message__meta">
                              <strong>{own ? 'You' : message.sender_name}</strong>
                              <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                            </div>
                          )}
                          <p>{message.message}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <form className="discussion-composer" onSubmit={handleSendMessage}>
              <div className="discussion-composer__field">
                <textarea
                  ref={composerRef}
                  rows="1"
                  maxLength="4000"
                  value={inputMessage}
                  onChange={(event) => setInputMessage(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={`Message ${getRoomName(selectedRoom)}`}
                  aria-label={`Message ${getRoomName(selectedRoom)}`}
                />
              </div>
              <button
                type="submit"
                className="discussion-send"
                disabled={!inputMessage.trim() || sending}
                aria-label={sending ? 'Sending message' : 'Send message'}
              >
                {sending ? <LoaderCircle className="discussion-spin" /> : <Send aria-hidden="true" />}
              </button>
            </form>
          </>
        ) : (
          <div className="discussion-welcome">
            <div className="discussion-welcome__art" aria-hidden="true">
              <span><MessageCircle /></span>
              <i />
              <i />
              <i />
            </div>
            <p className="discussion-eyebrow">Shared thinking</p>
            <h2>Where good work begins.</h2>
            <p>
              Open a conversation to exchange ideas, ask a quick question, or keep your
              collaboration moving.
            </p>
            <div>
              <button type="button" className="discussion-primary-action" onClick={openNewDMSelector}>
                <Plus aria-hidden="true" /> New message
              </button>
              <button type="button" className="discussion-secondary-action" onClick={openGroupSelector}>
                <Users aria-hidden="true" /> Create group
              </button>
            </div>
          </div>
        )}
      </main>

      {showDMModal && (
        <Modal
          eyebrow="New message"
          title="Choose a collaborator"
          description="Find someone across your academic network."
          onClose={() => setShowDMModal(false)}
        >
          <label className="discussion-search discussion-search--modal">
            <Search aria-hidden="true" />
            <span className="sr-only">Search collaborators</span>
            <input
              autoFocus
              type="search"
              value={peopleQuery}
              onChange={(event) => setPeopleQuery(event.target.value)}
              placeholder="Search by name, role, or institution"
            />
          </label>
          <div className="discussion-people-list">
            {peopleLoading ? (
              <ChatSkeleton />
            ) : availableUsers.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No collaborators found"
                description="Try another name, role, or institution."
              />
            ) : (
              availableUsers.map((person) => (
                <button
                  type="button"
                  key={person.id}
                  className="discussion-person"
                  onClick={() => startDMRoom(person.id)}
                  disabled={creating}
                >
                  <Avatar name={person.full_name} src={person.avatar_url} size="md" />
                  <span>
                    <strong>{person.full_name}</strong>
                    <small>
                      {[person.role, person.institution_name].filter(Boolean).join(' · ')}
                    </small>
                  </span>
                  {sameId(creatingTargetId, person.id) ? (
                    <LoaderCircle className="discussion-spin" />
                  ) : (
                    <ChevronRight />
                  )}
                </button>
              ))
            )}
          </div>
        </Modal>
      )}

      {showGroupModal && (
        <Modal
          eyebrow="Group discussion"
          title="Bring the team together"
          description="Name the space and invite the right collaborators."
          onClose={closeGroupModal}
        >
          <form className="discussion-group-form" onSubmit={handleCreateGroup}>
            <label className="discussion-field">
              <span>Group name</span>
              <input
                autoFocus
                type="text"
                maxLength="255"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="e.g. Climate Data Research"
              />
            </label>

            <label className="discussion-search discussion-search--modal">
              <Search aria-hidden="true" />
              <span className="sr-only">Search collaborators</span>
              <input
                type="search"
                value={peopleQuery}
                onChange={(event) => setPeopleQuery(event.target.value)}
                placeholder="Search collaborators"
              />
            </label>

            <div className="discussion-group-label">
              <span>Select members</span>
              <b>{selectedUserIds.length} selected</b>
            </div>

            <div className="discussion-people-list discussion-people-list--selectable">
              {peopleLoading ? (
                <ChatSkeleton />
              ) : availableUsers.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No collaborators found"
                  description="Try another name, role, or institution."
                />
              ) : (
                availableUsers.map((person) => {
                  const selected = selectedUserIds.some((id) => sameId(id, person.id));
                  return (
                    <button
                      type="button"
                      key={person.id}
                      className={`discussion-person ${selected ? 'is-selected' : ''}`}
                      onClick={() => toggleGroupMember(person.id)}
                      aria-pressed={selected}
                    >
                      <span className="discussion-check">
                        {selected && <Check aria-hidden="true" />}
                      </span>
                      <Avatar name={person.full_name} src={person.avatar_url} size="sm" />
                      <span>
                        <strong>{person.full_name}</strong>
                        <small>{person.role}</small>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="discussion-modal__actions">
              <button type="button" className="discussion-secondary-action" onClick={closeGroupModal}>
                Cancel
              </button>
              <button
                type="submit"
                className="discussion-primary-action"
                disabled={!groupName.trim() || selectedUserIds.length === 0 || creating}
              >
                {creating ? <LoaderCircle className="discussion-spin" /> : <Users aria-hidden="true" />}
                Create group
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};

export default Chat;
