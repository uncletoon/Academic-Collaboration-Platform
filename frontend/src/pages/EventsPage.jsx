import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Globe2,
  Link2,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  title: "",
  description: "",
  eventDate: "",
  location: "Online",
  meetingLink: "",
  capacity: 100,
  isInstitutional: false,
};

const formatDate = (value, options = {}) =>
  new Intl.DateTimeFormat(undefined, options).format(new Date(value));

const toDateTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const EventModal = ({ title, description, onClose, children }) => {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement;
    const onKeyDown = (event) => event.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      className="event-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="event-modal__head">
          <div>
            <p className="event-kicker">Event creator</p>
            <h2 id="event-modal-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button
            className="event-icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
};

const EventsPage = () => {
  const { user } = useAuth();
  const isCreatorRole = ["admin", "institution_admin"].includes(user?.role);
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const notify = (text, tone = "success") => {
    setMessage({ text, tone });
    window.setTimeout(() => setMessage(null), 4500);
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const result = await api.getEvents();
      setEvents(result.events || []);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const openEvent = async (eventOrId, updateUrl = true) => {
    const id = typeof eventOrId === "object" ? eventOrId.id : eventOrId;
    setDetailLoading(true);
    try {
      const result = await api.getEventDetails(id);
      setSelected(result.event);
      setAttendees(result.attendees || []);
      if (updateUrl) window.history.replaceState(null, "", `/events?id=${id}`);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const eventId = new URLSearchParams(window.location.search).get("id");
    if (eventId) openEvent(eventId, false);
  }, []);

  const now = Date.now();
  const visibleEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesSearch =
          `${event.title} ${event.description} ${event.location} ${event.organizer_name || ""}`
            .toLowerCase()
            .includes(search.toLowerCase());
        const eventTime = new Date(event.event_date).getTime();
        const isOwner = Number(event.organizer_id) === Number(user?.id);
        const matchesFilter =
          filter === "all" ||
          (filter === "upcoming" && eventTime >= now) ||
          (filter === "registered" && event.is_registered) ||
          (filter === "past" && eventTime < now) ||
          (filter === "mine" && isOwner);
        return matchesSearch && matchesFilter;
      }),
    [events, filter, search, user?.id],
  );

  const upcomingCount = events.filter(
    (event) => new Date(event.event_date).getTime() >= now,
  ).length;
  const registeredCount = events.filter((event) => event.is_registered).length;
  const createdCount = events.filter(
    (event) => Number(event.organizer_id) === Number(user?.id),
  ).length;

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(false);
    setShowForm(false);
  };

  const startCreate = () => {
    setForm(emptyForm);
    setEditing(false);
    setShowForm(true);
  };

  const startEdit = () => {
    setForm({
      title: selected.title,
      description: selected.description,
      eventDate: toDateTimeInput(selected.event_date),
      location: selected.location || "Online",
      meetingLink: selected.meeting_link || "",
      capacity: selected.capacity || 100,
      isInstitutional: Boolean(selected.institution_id),
    });
    setEditing(true);
    setShowForm(true);
  };

  const saveEvent = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = editing
        ? await api.updateEvent(selected.id, form)
        : await api.createEvent(form);
      resetForm();
      await loadEvents();
      notify(result.message);
      await openEvent(result.event.id);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleRegistration = async (eventId) => {
    setBusy(true);
    try {
      const result = await api.toggleEventRegistration(eventId);
      await Promise.all([loadEvents(), openEvent(eventId)]);
      notify(
        result.isRegistered
          ? "You are registered. Meeting access is now available."
          : "Your registration has been cancelled.",
      );
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const deleteEvent = async () => {
    if (
      !window.confirm(
        `Delete "${selected.title}" and all registrations? This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    try {
      const result = await api.deleteEvent(selected.id);
      setSelected(null);
      setAttendees([]);
      window.history.replaceState(null, "", "/events");
      await loadEvents();
      notify(result.message);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const joinMeeting = () => {
    if (!selected.meeting_link) {
      notify(
        "No meeting link is available yet. Please come back in a few days.",
        "info",
      );
      return;
    }
    window.open(selected.meeting_link, "_blank", "noopener,noreferrer");
  };

  const closeDetail = () => {
    setSelected(null);
    setAttendees([]);
    window.history.replaceState(null, "", "/events");
  };

  const eventForm = (
    <form className="event-form" onSubmit={saveEvent}>
      <label>
        <span>Event title</span>
        <input
          autoFocus
          required
          maxLength="255"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="e.g. Responsible AI research forum"
        />
      </label>
      <label>
        <span>Description</span>
        <textarea
          required
          rows="5"
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
          placeholder="Share the agenda, speakers, learning goals, and anything attendees should prepare."
        />
      </label>
      <div className="event-form__grid">
        <label>
          <span>Date and time</span>
          <input
            type="datetime-local"
            required
            value={form.eventDate}
            onChange={(event) =>
              setForm({ ...form, eventDate: event.target.value })
            }
          />
        </label>
        <label>
          <span>Capacity</span>
          <input
            type="number"
            min="1"
            max="10000"
            required
            value={form.capacity}
            onChange={(event) =>
              setForm({ ...form, capacity: Number(event.target.value) })
            }
          />
        </label>
      </div>
      <label>
        <span>Location</span>
        <input
          value={form.location}
          onChange={(event) =>
            setForm({ ...form, location: event.target.value })
          }
          placeholder="Online or a physical venue"
        />
      </label>
      <label>
        <span>
          Meeting link <em>Optional</em>
        </span>
        <input
          type="url"
          value={form.meetingLink}
          onChange={(event) =>
            setForm({ ...form, meetingLink: event.target.value })
          }
          placeholder="Add now, or edit the event and add it later"
        />
        <small>Only registered students can access this link.</small>
      </label>
      <label className="event-check">
        <input
          type="checkbox"
          checked={form.isInstitutional}
          onChange={(event) =>
            setForm({ ...form, isInstitutional: event.target.checked })
          }
        />
        <span>
          <strong>My institution only</strong>
          <small>
            Limit registration to people at{" "}
            {user?.institution_name || "your institution"}.
          </small>
        </span>
      </label>
      <div className="event-form__actions">
        <button
          type="button"
          className="event-button event-button--quiet"
          onClick={resetForm}
        >
          Cancel
        </button>
        <button className="event-button event-button--primary" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Publish event"}
        </button>
      </div>
    </form>
  );

  if (selected || detailLoading) {
    if (!selected)
      return <div className="event-loading">Opening event details…</div>;
    const isOwner = Number(selected.organizer_id) === Number(user?.id);
    const canManage = isOwner || user?.role === "admin";
    const isPast = new Date(selected.event_date).getTime() < now;
    const isFull =
      Number(selected.registered_count) >= Number(selected.capacity);
    return (
      <div
        className={`event-page ${canManage ? "event-page--creator" : "event-page--student"}`}
      >
        {message && (
          <div
            className={`event-toast event-toast--${message.tone}`}
            role="status"
          >
            {message.text}
          </div>
        )}
        <button className="event-back" onClick={closeDetail}>
          <ArrowLeft /> Event directory
        </button>
        <header className="event-detail-hero">
          <div className="event-detail-date">
            <span>{formatDate(selected.event_date, { month: "short" })}</span>
            <strong>
              {formatDate(selected.event_date, { day: "2-digit" })}
            </strong>
            <small>
              {formatDate(selected.event_date, { year: "numeric" })}
            </small>
          </div>
          <div className="event-detail-hero__main">
            <p className="event-kicker">
              {canManage ? "Creator workspace" : "Event overview"}
            </p>
            <h1>{selected.title}</h1>
            <p>{selected.description}</p>
          </div>
        </header>

        <div className="event-detail-grid">
          <main className="event-paper">
            <div className="event-section-title">
              <span>
                <CalendarDays />
              </span>
              <div>
                <p className="event-kicker">Before you register</p>
                <h2>Everything you need to know</h2>
              </div>
            </div>
            <div className="event-info-grid">
              <article>
                <Clock3 />
                <span>
                  <small>Date & time</small>
                  <strong>
                    {formatDate(selected.event_date, {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </strong>
                </span>
              </article>
              <article>
                <MapPin />
                <span>
                  <small>Where</small>
                  <strong>{selected.location || "Online"}</strong>
                </span>
              </article>
              <article>
                <Users />
                <span>
                  <small>Availability</small>
                  <strong>
                    {selected.registered_count} of {selected.capacity} places
                    taken
                  </strong>
                </span>
              </article>
              <article>
                <ShieldCheck />
                <span>
                  <small>Access</small>
                  <strong>
                    {selected.institution_name || "All institutions welcome"}
                  </strong>
                </span>
              </article>
            </div>
            <div className="event-registration-panel">
              {canManage ? (
                <>
                  <div>
                    <p className="event-kicker">Creator controls</p>
                    <h3>Manage this event</h3>
                    <p>
                      Edit event details or add the meeting link whenever it
                      becomes available.
                    </p>
                  </div>
                  <div className="event-action-row">
                    <button
                      className="event-button event-button--quiet"
                      onClick={startEdit}
                    >
                      <Pencil /> Edit event
                    </button>
                    <button
                      className="event-button event-button--danger"
                      onClick={deleteEvent}
                      disabled={busy}
                    >
                      <Trash2 /> Delete
                    </button>
                  </div>
                </>
              ) : selected.is_registered ? (
                <>
                  <div>
                    <p className="event-kicker">You’re registered</p>
                    <h3>Your place is confirmed</h3>
                    <p>
                      You can cancel your registration, or open the meeting when
                      the organizer shares the link.
                    </p>
                  </div>
                  <div className="event-action-row">
                    <button
                      className="event-button event-button--quiet"
                      onClick={() => toggleRegistration(selected.id)}
                      disabled={busy}
                    >
                      Cancel registration
                    </button>
                    <button
                      className="event-button event-button--primary"
                      onClick={joinMeeting}
                    >
                      <Video /> Join meeting
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="event-kicker">Ready to attend?</p>
                    <h3>
                      {isPast
                        ? "Registration has closed"
                        : isFull
                          ? "This event is full"
                          : "Reserve your place"}
                    </h3>
                    <p>
                      Registration unlocks meeting access when a link is
                      available.
                    </p>
                  </div>
                  <button
                    className="event-button event-button--primary"
                    onClick={() => toggleRegistration(selected.id)}
                    disabled={busy || isPast || isFull}
                  >
                    <CheckCircle2 /> {busy ? "Registering…" : "Register now"}
                  </button>
                </>
              )}
            </div>
            {canManage && (
              <div
                className={`event-meeting-card ${selected.meeting_link ? "is-ready" : ""}`}
              >
                <span>
                  <Link2 />
                </span>
                <div>
                  <strong>
                    {selected.meeting_link
                      ? "Meeting room is ready"
                      : "Meeting link coming soon"}
                  </strong>
                  <p>
                    {selected.meeting_link
                      ? "Use the secure event link when it is time to join."
                      : "No link is available yet. Please come back in a few days."}
                  </p>
                </div>
                <button
                  className="event-button event-button--meeting"
                  onClick={joinMeeting}
                >
                  {selected.meeting_link ? (
                    <>
                      <ExternalLink /> Open link
                    </>
                  ) : (
                    <>
                      <Clock3 /> Check link
                    </>
                  )}
                </button>
              </div>
            )}
          </main>

          <aside className="event-paper event-sidebar">
            {canManage ? (
              <>
                <div className="event-section-title event-section-title--small">
                  <span>
                    <Users />
                  </span>
                  <div>
                    <p className="event-kicker">Creator only</p>
                    <h2>Registered attendees</h2>
                  </div>
                </div>
                <p className="event-attendee-summary">
                  <strong>{attendees.length}</strong> of {selected.capacity}{" "}
                  places filled
                </p>
                <div className="event-attendee-list">
                  {attendees.length ? (
                    attendees.map((person) => (
                      <article key={person.id}>
                        <span className="event-avatar">
                          {person.avatar_url ? (
                            <img
                              src={`http://127.0.0.1:5000${person.avatar_url}`}
                              alt=""
                            />
                          ) : (
                            person.full_name?.slice(0, 1)
                          )}
                        </span>
                        <span>
                          <strong>{person.full_name}</strong>
                          <small>
                            {person.role} · {person.email}
                          </small>
                        </span>
                      </article>
                    ))
                  ) : (
                    <p className="event-sidebar-empty">
                      No one has registered yet.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="event-section-title event-section-title--small">
                  <span>
                    <ShieldCheck />
                  </span>
                  <div>
                    <p className="event-kicker">Privacy</p>
                    <h2>Attendee details stay private</h2>
                  </div>
                </div>
                <p className="event-sidebar-copy">
                  Only the event creator can view the attendee list. Students
                  see availability without seeing member identities.
                </p>
                <div className="event-capacity-meter">
                  <span
                    style={{
                      width: `${Math.min(100, (selected.registered_count / selected.capacity) * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {Math.max(0, selected.capacity - selected.registered_count)}{" "}
                  places remaining
                </small>
              </>
            )}
          </aside>
        </div>

        {showForm && (
          <EventModal
            title="Edit event"
            description="Update event details or add the meeting link when it is ready."
            onClose={resetForm}
          >
            {eventForm}
          </EventModal>
        )}
      </div>
    );
  }

  return (
    <div
      className={`event-page ${isCreatorRole ? "event-page--creator" : "event-page--student"}`}
    >
      {message && (
        <div
          className={`event-toast event-toast--${message.tone}`}
          role="status"
        >
          {message.text}
        </div>
      )}
      <header className="collab-overview-header event-overview-header">
        <div className="collab-overview-header__top">
          <div>
            <p className="event-kicker">
              {isCreatorRole
                ? "Event creator workspace"
                : "Academic event directory"}
            </p>
            <h1>Events</h1>
            <p>
              {isCreatorRole
                ? "Publish events, manage every detail, and share meeting access when you are ready."
                : "Explore upcoming events, read the full details, and register for the ones that move you forward."}
            </p>
          </div>
          {isCreatorRole && (
            <button
              className="event-button event-button--primary"
              onClick={startCreate}
            >
              <Plus /> Create event
            </button>
          )}
        </div>
        <div
          className="collab-summary-grid event-summary-grid"
          aria-label="Event summary"
        >
          <button
            onClick={() => setFilter("upcoming")}
            aria-label={`Show ${upcomingCount} upcoming events`}
          >
            <span className="collab-summary-icon collab-summary-icon--blue">
              <CalendarDays />
            </span>
            <span>
              <strong>{upcomingCount}</strong>
              <small>Upcoming</small>
            </span>
            <ChevronRight />
          </button>
          <button
            onClick={() => setFilter("registered")}
            aria-label={`Show ${registeredCount} registered events`}
          >
            <span className="collab-summary-icon collab-summary-icon--cyan">
              <CheckCircle2 />
            </span>
            <span>
              <strong>{registeredCount}</strong>
              <small>Registered</small>
            </span>
            <ChevronRight />
          </button>
          <button
            onClick={() => setFilter(isCreatorRole ? "mine" : "all")}
            aria-label={
              isCreatorRole
                ? `Show ${createdCount} events created by you`
                : "Show all events"
            }
          >
            <span className="collab-summary-icon collab-summary-icon--violet">
              {isCreatorRole ? <Video /> : <Globe2 />}
            </span>
            <span>
              <strong>{isCreatorRole ? createdCount : events.length}</strong>
              <small>{isCreatorRole ? "Created by you" : "All events"}</small>
            </span>
            <ChevronRight />
          </button>
        </div>
      </header>

      <section className="event-directory">
        <div className="event-directory__heading">
          <div>
            <p className="event-kicker">
              {isCreatorRole ? "Manage and discover" : "Discover what’s next"}
            </p>
            <h2>
              {isCreatorRole
                ? "Your event workspace"
                : "Upcoming opportunities"}
            </h2>
          </div>
          <label className="event-search">
            <Search />
            <span className="sr-only">Search events</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, topic, host, or location"
            />
          </label>
        </div>
        <div className="event-filter-row" aria-label="Filter events">
          {[
            ["upcoming", "Upcoming"],
            ["registered", "Registered"],
            ...(isCreatorRole ? [["mine", "Created by me"]] : []),
            ["past", "Past"],
            ["all", "All events"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="event-loading">Loading events…</div>
        ) : visibleEvents.length ? (
          <div className="event-card-list">
            {visibleEvents.map((event) => {
              const isOwner = Number(event.organizer_id) === Number(user?.id);
              const canManage = isOwner || user?.role === "admin";
              const isPast = new Date(event.event_date).getTime() < now;
              return (
                <button
                  className={`event-card ${isOwner ? "event-card--owned" : ""}`}
                  key={event.id}
                  onClick={() => openEvent(event)}
                >
                  <span className="event-card__date">
                    <small>
                      {formatDate(event.event_date, { month: "short" })}
                    </small>
                    <strong>
                      {formatDate(event.event_date, { day: "2-digit" })}
                    </strong>
                    <em>
                      {formatDate(event.event_date, { weekday: "short" })}
                    </em>
                  </span>
                  <span className="event-card__body">
                    <span className="event-card__labels">
                      {isOwner && (
                        <span className="event-label event-label--owner">
                          Created by you
                        </span>
                      )}
                      {event.is_registered && !isOwner && (
                        <span className="event-label event-label--registered">
                          Registered
                        </span>
                      )}
                      {isPast && (
                        <span className="event-label">Past event</span>
                      )}
                    </span>
                    <strong>{event.title}</strong>
                    <span className="event-card__description">
                      {event.description}
                    </span>
                    <span className="event-card__meta">
                      <span>
                        <Clock3 />{" "}
                        {formatDate(event.event_date, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span>
                        <MapPin /> {event.location || "Online"}
                      </span>
                      <span>
                        <Users /> {event.registered_count}/{event.capacity}{" "}
                        places
                      </span>
                    </span>
                  </span>
                  <span className="event-card__action">
                    <small>{canManage ? "Manage event" : "Read details"}</small>
                    <ChevronRight />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="event-empty">
            <CalendarDays />
            <h3>No events match this view</h3>
            <p>
              Try another filter or search term
              {isCreatorRole ? ", or publish a new event." : "."}
            </p>
          </div>
        )}
      </section>

      {showForm && (
        <EventModal
          title="Create an event"
          description="Share the full details now. The private meeting link can be added now or later."
          onClose={resetForm}
        >
          {eventForm}
        </EventModal>
      )}
    </div>
  );
};

export default EventsPage;
