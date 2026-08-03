import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  LayoutDashboard,
  Users,
  FolderGit2,
  CalendarDays,
  Newspaper,
  MessageSquareCode,
  ShieldAlert,
  UserCircle2,
  LogOut,
  GraduationCap,
  X
} from 'lucide-react';

const Sidebar = ({ currentTab, setCurrentTab, mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'communities', label: 'Communities', icon: Users },
    { id: 'projects', label: 'Collaboration', icon: FolderGit2 },
    { id: 'events', label: 'Events', icon: CalendarDays },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'chat', label: 'Discussions', icon: MessageSquareCode },
  ];

  if (['admin', 'institution_admin'].includes(user?.role)) {
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: ShieldAlert });
  }

  const baseClasses = "fixed inset-y-0 left-0 z-50 w-64 transform transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col bg-white border-r lg:translate-x-0 lg:static lg:inset-auto";
  const mobileClasses = mobileOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-canvas-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`${baseClasses} ${mobileClasses}`}>
        {/* Decorative Top Blur */}
        <div className="absolute top-0 left-0 w-full h-32 pointer-events-none bg-gradient-to-b from-blue-600/5 to-transparent" />

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="relative h-16 flex items-center px-6 shrink-0 border-b border-slate-300">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl mr-3 group bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <GraduationCap className="h-6 w-6 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12 text-blue-600" />
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse-glow bg-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display tracking-tight text-blue-800">
              Collaboration
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1">
              Private Projects
            </p>
          </div>
          
          <button 
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-auto p-2 rounded-lg text-slate-700 hover:bg-canvas-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 relative z-10 scrollbar-hide">
          <p className="px-4 text-xs font-semibold uppercase tracking-wider mb-4">
            Menu
          </p>
          
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full group relative flex items-center px-4 py-3.5 mb-1.5 rounded-2xl text-sm font-semibold transition-all duration-300 overflow-hidden ${active ? 'text-blue-900 shadow-[0_4px_12px_rgba(37,99,235,0.10)]' : 'text-slate-600 hover:bg-blue-50/70 hover:text-blue-700'}`}
              >
                {/* Active Background Layer */}
                {active && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-100/80 to-transparent border border-blue-600/15" />
                )}

                {/* Active Indicator Line */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-r-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                )}

                <Icon
                  className={`relative z-10 mr-3.5 h-5 w-5 transition-transform duration-300 ${active ? 'scale-110 text-blue-600' : 'group-hover:scale-110 text-slate-600'}`}
                />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── User & Logout ──────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-300 bg-canvas-50/50 relative z-10">
          <button
            onClick={() => { setCurrentTab('profile'); setMobileOpen(false); }}
            className={`w-full flex items-center px-4 py-3 rounded-2xl transition-all duration-300 group mb-2 border ${currentTab === 'profile' ? 'bg-blue-100/50 border-blue-600/20' : 'border-transparent hover:bg-canvas-100 hover:border-slate-200'}`}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-9 h-9 rounded-xl object-cover shadow-sm ring-2 ring-blue-200" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600 ring-2 ring-blue-50">
                <UserCircle2 className="w-5 h-5" />
              </div>
            )}
            <div className="ml-3 text-left overflow-hidden">
              <p className="text-sm font-bold truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest truncate">
                {user?.role_name || user?.role || 'Guest'}
              </p>
            </div>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-3 rounded-2xl text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-300 border border-transparent hover:border-red-100 group"
          >
            <LogOut className="mr-3 h-5 w-5 transition-transform group-hover:-translate-x-1" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
