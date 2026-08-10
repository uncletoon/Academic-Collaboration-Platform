import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Newspaper, CalendarDays, CheckCircle2, FolderKanban,
  MessageCircleMore, Network, Sparkles, Users, UserRoundSearch
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageIntro, StatPill } from '../components/PortalPrimitives';

const Home = ({ setCurrentTab }) => {
  const { user } = useAuth();
  const [data, setData] = useState({ communities: [], projects: [], events: [], news: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.getCommunities(), api.getProjects(), api.getEvents(), api.getNews()])
      .then(([communities, projects, events, news]) => {
        if (!active) return;
        setData({
          communities: communities.value?.communities || [],
          projects: projects.value?.projects || [],
          events: events.value?.events || [],
          news: news.value?.news || [],
        });
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const upcoming = useMemo(
    () => data.events.filter((event) => new Date(event.event_date) >= new Date()).slice(0, 3),
    [data.events]
  );
  const firstName = user?.full_name?.split(' ')[0] || 'Scholar';

  const destinations = [
    {
      id: 'communities', icon: Users, eyebrow: 'Find your people', title: 'Academic communities',
      description: 'Join focused circles, exchange ideas, and keep up with conversations in your field.',
      meta: `${data.communities.length} communities`, tone: 'blue'
    },
    {
      id: 'projects', icon: FolderKanban, eyebrow: 'Build together', title: 'Collaborative projects',
      description: 'Turn shared questions into structured work with teams, files, and clear project roles.',
      meta: `${data.projects.length} workspaces`, tone: 'cyan'
    },
    {
      id: 'events', icon: CalendarDays, eyebrow: 'Meet and learn', title: 'Academic events',
      description: 'Discover seminars, thesis defenses, workshops, and sessions across institutions.',
      meta: `${upcoming.length} coming up`, tone: 'amber'
    },
  ];

  return (
    <div className="portal-page space-y-10 pb-16">
      <PageIntro
        eyebrow="Your collaboration home"
        title={<>Good to see you, <em>{firstName}.</em><br />What will you move forward today?</>}
        description="Aca brings the people, work, and academic moments that matter into one focused place."
        action={<div className="portal-home-visual" aria-label="Connected academic work">
          <div className="portal-home-visual__top">
            <span><Network aria-hidden="true" /> Collaboration pulse</span>
            <small>Live</small>
          </div>
          <div className="portal-orbit">
            <span className="portal-orbit__core"><GraduationCapIcon /></span>
            <span className="portal-orbit__node portal-orbit__node--one"><Users /></span>
            <span className="portal-orbit__node portal-orbit__node--two"><FolderKanban /></span>
            <span className="portal-orbit__node portal-orbit__node--three"><CalendarDays /></span>
          </div>
          <div className="portal-home-visual__activity">
            <span><i /> Academic members connecting now</span>
            <strong>{data.communities.reduce((total, item) => total + Number(item.member_count || 0), 0) || 'Growing'}</strong>
          </div>
        </div>}
      >
        <div className="portal-hero__proof">
          <span><CheckCircle2 aria-hidden="true" /> Cross-institution discovery</span>
          <span><CheckCircle2 aria-hidden="true" /> Collaboration-ready workspaces</span>
        </div>
        <div className="portal-home-cta-row">
          <button className="portal-primary-button" onClick={() => setCurrentTab('communities')}>Explore the network <ArrowRight /></button>
          <button className="portal-secondary-button" onClick={() => setCurrentTab('projects')}>Open your projects</button>
        </div>
      </PageIntro>

      <section aria-labelledby="overview-heading">
        <div className="portal-section-heading">
          <div><p className="portal-eyebrow">At a glance</p><h2 id="overview-heading">Your academic network</h2></div>
          <p>Live activity from the spaces you can access.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatPill icon={Users} value={loading ? '—' : data.communities.length} label="Communities" />
          <StatPill icon={FolderKanban} value={loading ? '—' : data.projects.length} label="Your projects" tone="cyan" />
          <StatPill icon={CalendarDays} value={loading ? '—' : upcoming.length} label="Upcoming events" tone="amber" />
          <StatPill icon={Newspaper} value={loading ? '—' : data.news.length} label="News stories" tone="violet" />
        </div>
      </section>

      <section aria-labelledby="explore-heading">
        <div className="portal-section-heading">
          <div><p className="portal-eyebrow">Explore the platform</p><h2 id="explore-heading">Everything needed to collaborate well</h2></div>
        </div>
        <div className="portal-destination-grid">
          {destinations.map(({ id, icon: Icon, eyebrow, title, description, meta, tone }) => (
            <button key={id} className={`portal-destination portal-destination--${tone}`} onClick={() => setCurrentTab(id)}>
              <span className="portal-destination__top">
                <span className="portal-destination__icon"><Icon aria-hidden="true" /></span>
                <ArrowRight aria-hidden="true" />
              </span>
              <span className="portal-eyebrow">{eyebrow}</span>
              <strong>{title}</strong>
              <span className="portal-destination__copy">{description}</span>
              <span className="portal-destination__meta">{meta}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="portal-home-split" aria-label="Upcoming activity and quick actions">
        <div className="portal-panel">
          <div className="portal-panel__head">
            <div><p className="portal-eyebrow">Next on the calendar</p><h2>Upcoming events</h2></div>
            <button className="portal-text-link" onClick={() => setCurrentTab('events')}>View all <ArrowRight /></button>
          </div>
          {upcoming.length ? (
            <div className="space-y-2">
              {upcoming.map((event) => {
                const date = new Date(event.event_date);
                return (
                  <button key={event.id} className="portal-event-row" onClick={() => setCurrentTab('events')}>
                    <span className="portal-date"><small>{date.toLocaleDateString([], { month: 'short' })}</small>{date.getDate()}</span>
                    <span><strong>{event.title}</strong><small>{event.location || 'Online'} · {event.registered_count || 0} registered</small></span>
                    <ArrowRight aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          ) : <p className="portal-muted">There are no upcoming events yet. New sessions will appear here.</p>}
        </div>

        <aside className="portal-focus-card">
          <Sparkles aria-hidden="true" />
          <p className="portal-eyebrow">Make your next connection</p>
          <h2>Progress starts with the right conversation.</h2>
          <p>Find a specialist, enter a focused discussion, or share a research direction with the community.</p>
          <div>
            <button onClick={() => setCurrentTab('search')}><UserRoundSearch /> Find collaborators</button>
            <button onClick={() => setCurrentTab('chat')}><MessageCircleMore /> Open discussions</button>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default Home;

const GraduationCapIcon = () => <span className="portal-core-mark">A</span>;
