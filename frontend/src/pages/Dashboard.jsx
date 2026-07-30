import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  FolderGit2, 
  Calendar, 
  Newspaper,
  PlusCircle, 
  ExternalLink,
  ArrowRight,
  MessageSquareCode
} from 'lucide-react';

const Dashboard = ({ setCurrentTab }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ communities: 0, projects: 0, events: 0, papers: 0 });
  const [recentProjects, setRecentProjects] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [projRes, eventRes, commRes, paperRes] = await Promise.all([
          api.getProjects(),
          api.getEvents(),
          api.getCommunities(),
          api.getNews()
        ]);
        const joinedComms = commRes.communities?.filter(c => c.is_member).length || 0;
        setStats({
          communities: joinedComms,
          projects: projRes.projects?.length || 0,
          events: eventRes.events?.length || 0,
          papers: paperRes.news?.length || 0
        });
        setRecentProjects(projRes.projects?.slice(0, 3) || []);
        setUpcomingEvents(eventRes.events?.slice(0, 3) || []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const cardItems = [
    { title: 'Communities',     count: stats.communities, icon: Users,       tab: 'communities', colorClass: 'text-blue-600', bgClass: 'bg-blue-50', borderClass: 'border-blue-200', hoverBorder: 'hover:border-blue-200', shadowClass: 'hover:shadow-[0_12px_28px_-8px_rgba(37,99,235,0.25)]' },
    { title: 'Active Projects', count: stats.projects,    icon: FolderGit2,  tab: 'projects',    colorClass: 'text-violet-600', bgClass: 'bg-violet-50', borderClass: 'border-violet-200', hoverBorder: 'hover:border-violet-200', shadowClass: 'hover:shadow-[0_12px_28px_-8px_rgba(124,58,237,0.25)]' },
    { title: 'Upcoming Events', count: stats.events,      icon: Calendar,    tab: 'events',      colorClass: 'text-cyan-600', bgClass: 'bg-cyan-50', borderClass: 'border-cyan-200', hoverBorder: 'hover:border-cyan-200', shadowClass: 'hover:shadow-[0_12px_28px_-8px_rgba(8,145,178,0.25)]' },
    { title: 'Latest News',     count: stats.papers,      icon: Newspaper,   tab: 'news',        colorClass: 'text-blue-600', bgClass: 'bg-blue-50', borderClass: 'border-blue-200', hoverBorder: 'hover:border-blue-200', shadowClass: 'hover:shadow-[0_12px_28px_-8px_rgba(37,99,235,0.25)]' },
  ];

  return (
    <div className={`space-y-8 pb-12 transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

      {/* ── Welcome Banner ───────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 animate-slide-up bg-gradient-to-br from-slate-900 via-blue-900 to-blue-600 shadow-[0_24px_48px_-12px_rgba(37,99,235,0.25)]"
      >
        {/* Decorative orbs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(96,165,250,0.25)_0%,transparent_65%)] blur-[40px]" />
        <div className="absolute -bottom-16 -left-8 w-56 h-56 rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(147,197,253,0.2)_0%,transparent_65%)] blur-[30px]" />
        {/* Orbit ring decoration */}
        <div className="absolute top-1/2 right-16 -translate-y-1/2 w-48 h-48 rounded-full border border-dashed border-blue-300/50 opacity-10 animate-spin-slow hidden xl:block" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              
              <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                Academic Dashboard
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2 flex items-center flex-wrap gap-3 font-display text-white tracking-tight">
              <span>Welcome back,</span>
              <span className="px-3 py-0.5 rounded-xl text-2xl bg-white/10 border border-white/20 text-blue-300">
                {user.full_name}
              </span>
            </h1>
            <p className="text-sm font-medium text-white/80">
              {user.institution_name ? `${user.institution_name} • ` : ''}
              {user.department_name ? `${user.department_name} • ` : ''}
              <span className="capitalize">{user.role}</span>
            </p>
          </div>

          <button
            onClick={() => setCurrentTab('chat')}
            className="group relative flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm shrink-0 overflow-hidden transition-all duration-300 bg-white/15 border border-white/25 text-white backdrop-blur-md font-display shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:bg-white/20 hover:-translate-y-0.5"
          >
            {/* Shimmer */}
            <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <MessageSquareCode className="h-4.5 w-4.5" />
            <span>Open Live Chat</span>
          </button>
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cardItems.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              onClick={() => setCurrentTab(c.tab)}
              className={`group relative cursor-pointer rounded-2xl p-6 animate-slide-up transition-all duration-300 bg-white border-[1.5px] border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-1 ${c.shadowClass} ${c.hoverBorder}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex justify-between items-start mb-5">
                <div className={`p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 border ${c.bgClass} ${c.borderClass}`}>
                  <Icon className={`h-6 w-6 ${c.colorClass}`} />
                </div>
                <ArrowRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 ${c.colorClass}`} />
              </div>
              <span className="text-3xl font-bold block mb-1 text-slate-900 font-display">
                {loading ? (
                  <span className="inline-block w-8 h-8 rounded-lg animate-pulse bg-slate-200" />
                ) : c.count}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider block text-slate-800">
                {c.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Split Layout: Projects & Events ────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Left Col: Projects */}
        <div className="xl:col-span-2 space-y-5 animate-slide-up" style={{ animationDelay: '350ms' }}>
          <div className="flex justify-between items-end pb-3 border-b-[1.5px] border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Active Collaborations</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-1">Recent Project Activity</p>
            </div>
            <button
              onClick={() => setCurrentTab('projects')}
              className="text-xs font-bold flex items-center gap-1.5 transition-colors text-blue-600 hover:text-blue-700"
            >
              <span>View Directory</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="h-32 rounded-2xl animate-pulse bg-slate-100" />
            ) : recentProjects.length === 0 ? (
              <div className="rounded-2xl p-10 text-center flex flex-col items-center gap-3 bg-slate-50 border-[1.5px] border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-50 border border-blue-200">
                  <FolderGit2 className="h-6 w-6 text-blue-400" />
                </div>
                <p className="text-sm font-semibold">You aren't in any projects yet.</p>
                <button onClick={() => setCurrentTab('projects')} className="text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100">
                  Browse Projects →
                </button>
              </div>
            ) : (
              recentProjects.map((p, i) => (
                <div
                  key={p.id}
                  onClick={() => setCurrentTab('projects')}
                  className="group cursor-pointer rounded-2xl p-5 flex flex-col sm:flex-row justify-between gap-5 transition-all duration-300 bg-white border-[1.5px] border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(37,99,235,0.10)] hover:border-blue-200 hover:-translate-y-0.5"
                >
                  <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 bg-blue-50 border border-blue-200">
                      <FolderGit2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-slate-900 font-display">{p.title}</h4>
                      <p className="text-xs line-clamp-2 leading-relaxed font-medium">{p.description}</p>
                      <div className="flex items-center gap-3 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {p.member_count} Members</span>
                        <span className="opacity-40">•</span>
                        <span>Lead: {p.creator_name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="sm:self-center shrink-0">
                    <span className={`px-3 py-1.5 text-[9px] font-bold rounded-full uppercase tracking-widest border ${p.status === 'active' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Events */}
        <div className="space-y-5 animate-slide-up" style={{ animationDelay: '450ms' }}>
          <div className="flex justify-between items-end pb-3 border-b-[1.5px] border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Upcoming Events</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-1">Academic Calendar</p>
            </div>
            <button
              onClick={() => setCurrentTab('events')}
              className="text-xs font-bold flex items-center gap-1.5 transition-colors text-blue-600 hover:text-blue-700"
            >
              <span>Schedule</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="h-32 rounded-2xl animate-pulse bg-slate-100" />
            ) : upcomingEvents.length === 0 ? (
              <div className="rounded-2xl p-10 text-center flex flex-col items-center gap-3 bg-slate-50 border-[1.5px] border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-cyan-50 border border-cyan-200">
                  <Calendar className="h-6 w-6 text-cyan-600" />
                </div>
                <p className="text-sm font-semibold">No scheduled events.</p>
                <button onClick={() => setCurrentTab('events')} className="text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 bg-cyan-50 text-cyan-600 border border-cyan-200 hover:bg-cyan-100">
                  Browse Events →
                </button>
              </div>
            ) : (
              upcomingEvents.map((e) => {
                const dateObj = new Date(e.event_date);
                const month = dateObj.toLocaleDateString([], { month: 'short' });
                const day = dateObj.toLocaleDateString([], { day: 'numeric' });
                return (
                  <div
                    key={e.id}
                    onClick={() => setCurrentTab('events')}
                    className="group cursor-pointer rounded-2xl p-4 flex gap-4 items-center transition-all duration-300 bg-white border-[1.5px] border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(8,145,178,0.10)] hover:border-cyan-200 hover:-translate-y-0.5"
                  >
                    {/* Date Block */}
                    <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">{month}</span>
                      <span className="text-lg font-bold leading-none mt-0.5 text-blue-800 font-display">{day}</span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="text-sm font-bold truncate text-slate-900 font-display">{e.title}</h4>
                      <p className="text-xs truncate font-medium">{e.location || 'Online'}</p>
                      <div className="pt-1">
                        <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200">
                          <div
                            className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-blue-600 to-blue-400"
                            style={{
                              width: `${Math.min((e.registered_count / e.capacity) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                          <span>{e.registered_count} registered</span>
                          <span>{e.capacity} max</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
