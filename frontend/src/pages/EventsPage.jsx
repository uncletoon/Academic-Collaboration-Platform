import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Globe2, MapPin, Plus, Search, Users } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Modal, PageIntro, SearchField, StatPill } from '../components/PortalPrimitives';

const EventsPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('upcoming');
  const [selected, setSelected] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', eventDate: '', location: '', capacity: 50, isInstitutional: false });
  const load = async () => { setLoading(true); try { const result = await api.getEvents(); setEvents(result.events || []); } catch (err) { setError(err.message); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const open = async (event) => { try { const result = await api.getEventDetails(event.id); setSelected(result.event); setAttendees(result.attendees || []); } catch (err) { setError(err.message); } };
  const register = async (event) => { event.stopPropagation(); const eventId = event.currentTarget.dataset.id; try { await api.toggleEventRegistration(eventId); await load(); if (selected) await open(selected); } catch (err) { setError(err.message); } };
  const create = async (event) => { event.preventDefault(); try { await api.createEvent(form); setShowCreate(false); setForm({ title: '', description: '', eventDate: '', location: '', capacity: 50, isInstitutional: false }); await load(); } catch (err) { setError(err.message); } };
  const now = new Date();
  const filtered = useMemo(() => events.filter((event) => {
    const date = new Date(event.event_date);
    const matchesTime = filter === 'all' || (filter === 'upcoming' ? date >= now : event.is_registered);
    return matchesTime && `${event.title} ${event.description} ${event.location}`.toLowerCase().includes(search.toLowerCase());
  }), [events, search, filter]);

  const groupedEvents = useMemo(() => ({
    organized: filtered.filter((event) => Number(event.organizer_id) === Number(user?.id)),
    registered: filtered.filter(
      (event) => Number(event.organizer_id) !== Number(user?.id) && event.is_registered
    ),
    available: filtered.filter(
      (event) => Number(event.organizer_id) !== Number(user?.id) && !event.is_registered
    ),
  }), [filtered, user?.id]);

  const renderEventCard = (event) => {
    const date = new Date(event.event_date);
    const isFull = event.registered_count >= event.capacity;
    return (
      <article className="portal-event-card" key={event.id} onClick={() => open(event)}>
        <span className="portal-date portal-date--large"><small>{date.toLocaleDateString([], { month: 'short' })}</small>{date.getDate()}<em>{date.getFullYear()}</em></span>
        <div><span className="portal-eyebrow">{event.institution_name || 'Open academic event'}</span><h2>{event.title}</h2><p>{event.description || 'More information will be shared by the organizer.'}</p><div className="portal-detail-meta"><span><Clock3 /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span><MapPin /> {event.location || 'Online'}</span><span><Users /> {event.registered_count || 0}/{event.capacity}</span></div></div>
        {Number(event.organizer_id) === Number(user?.id)
          ? <span className="portal-badge portal-badge--joined">Organizer</span>
          : <button data-id={event.id} disabled={isFull && !event.is_registered} onClick={register} className={event.is_registered ? 'portal-secondary-button' : 'portal-primary-button'}>{event.is_registered ? 'Registered' : isFull ? 'Event full' : 'Register'}</button>}
      </article>
    );
  };

  const organizedCount = events.filter((event) => Number(event.organizer_id) === Number(user?.id)).length;
  const registeredCount = events.filter((event) => Number(event.organizer_id) !== Number(user?.id) && event.is_registered).length;
  const availableCount = events.filter((event) => Number(event.organizer_id) !== Number(user?.id) && !event.is_registered && new Date(event.event_date) >= now).length;
  return <div className="portal-page space-y-8 pb-16">
    <PageIntro className="portal-hero--compact" eyebrow="Academic calendar" title={<>Be in the room where knowledge <em>moves forward.</em></>} action={user.role !== 'student' && <button className="portal-primary-button" onClick={() => setShowCreate(true)}><Plus /> Schedule event</button>}>
      <div className="portal-hero__stats"><StatPill icon={CalendarDays} value={organizedCount} label="Organized by you" tone="amber" /><StatPill icon={Users} value={registeredCount} label="Registered events" /><StatPill icon={Globe2} value={availableCount} label="Available events" tone="cyan" /></div>
    </PageIntro>
    <section>
      <div className="portal-toolbar"><SearchField value={search} onChange={setSearch} placeholder="Search events, venues, or topics" label="Search events" /><div className="portal-filter-row">{['upcoming', 'registered', 'all'].map((item) => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
      {error && <div className="portal-alert">{error}</div>}
      <div className="portal-events-layout">
        <div>{loading ? <div className="portal-loading">Checking the calendar…</div> : filtered.length ? <div className="portal-community-groups">
          <section className="portal-community-group" aria-labelledby="organized-events-heading">
            <div className="portal-group-heading"><div><p className="portal-eyebrow">Hosted by you</p><h2 id="organized-events-heading">My events</h2></div><span>{groupedEvents.organized.length}</span></div>
            {groupedEvents.organized.length ? <div className="portal-event-section-list">{groupedEvents.organized.map(renderEventCard)}</div> : <div className="portal-group-empty">Events you organize will appear here.</div>}
          </section>
          <section className="portal-community-group" aria-labelledby="registered-events-heading">
            <div className="portal-group-heading"><div><p className="portal-eyebrow">Your schedule</p><h2 id="registered-events-heading">Registered events</h2></div><span>{groupedEvents.registered.length}</span></div>
            {groupedEvents.registered.length ? <div className="portal-event-section-list">{groupedEvents.registered.map(renderEventCard)}</div> : <div className="portal-group-empty">Events you register for will appear here.</div>}
          </section>
          <section className="portal-community-group" aria-labelledby="available-events-heading">
            <div className="portal-group-heading"><div><p className="portal-eyebrow">Discover what’s next</p><h2 id="available-events-heading">Available events</h2></div><span>{groupedEvents.available.length}</span></div>
            {groupedEvents.available.length ? <div className="portal-event-section-list">{groupedEvents.available.map(renderEventCard)}</div> : <div className="portal-group-empty">There are no other events available in this view.</div>}
          </section>
        </div> : <EmptyState icon={Search} title="No events found" description="Try another view or search for a different topic." />}</div>
        <aside className="portal-panel portal-event-detail">
          {selected ? <><p className="portal-eyebrow">Event details</p><h2>{selected.title}</h2><p>{selected.description}</p><div className="portal-detail-stack"><span><Globe2 /> Organized by {selected.organizer_name}</span><span><MapPin /> {selected.location}</span><span><Users /> {attendees.length} attendees</span></div><div className="portal-attendee-stack">{attendees.slice(0, 6).map((person) => <div className="portal-person" key={person.id}><span className="portal-avatar">{person.full_name?.slice(0, 1)}</span><span><strong>{person.full_name}</strong><small>{person.role}</small></span></div>)}</div></> : <EmptyState icon={CalendarDays} title="Choose an event" description="Select an event to see its full description, organizer, and attendees." />}
        </aside>
      </div>
    </section>
    {showCreate && <Modal title="Schedule an academic event" description="Add the essentials attendees need to decide and prepare." onClose={() => setShowCreate(false)}><form className="portal-form" onSubmit={create}><label>Event title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Description<textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="grid gap-4 sm:grid-cols-2"><label>Date and time<input type="datetime-local" required value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} /></label><label>Capacity<input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></label></div><label>Location or meeting link<input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label><label className="portal-check"><input type="checkbox" checked={form.isInstitutional} onChange={(e) => setForm({ ...form, isInstitutional: e.target.checked })} /> Restrict to my institution</label><div className="portal-form__actions"><button type="button" className="portal-secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button className="portal-primary-button">Schedule event</button></div></form></Modal>}
  </div>;
};
export default EventsPage;
