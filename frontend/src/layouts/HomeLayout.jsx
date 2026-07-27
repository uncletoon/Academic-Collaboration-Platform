import React, { useState } from 'react';
import {
  CalendarDays, ChevronDown, FolderKanban, GraduationCap,
  LayoutDashboard, LogOut, Menu, UserCircle2, Users, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HomeLayout = ({ children, setCurrentTab }) => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const avatarSrc = user?.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `http://127.0.0.1:5000${user.avatar_url}`)
    : null;

  const navigate = (tab) => {
    setCurrentTab(tab);
    setMobileOpen(false);
  };

  const navItems = [
    { id: 'communities', label: 'Communities', icon: Users },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'events', label: 'Events', icon: CalendarDays },
  ];

  return (
    <div className="home-shell">
      <a className="home-skip-link" href="#home-content">Skip to content</a>
      <header className="home-nav">
        <div className="home-nav__inner">
          <button className="home-brand" onClick={() => navigate('home')} aria-label="Aca Collaboration home">
            <span><GraduationCap aria-hidden="true" /></span>
            <span><strong>Aca</strong><small>Collaboration</small></span>
          </button>

          <nav className="home-nav__links" aria-label="Main navigation">
            {navItems.map(({ id, label }) => (
              <button key={id} onClick={() => navigate(id)}>{label}</button>
            ))}
            <button onClick={() => navigate('research')}>Research</button>
          </nav>

          <div className="home-nav__actions">
            <button className="home-dashboard-button" onClick={() => navigate('dashboard')}>
              <LayoutDashboard aria-hidden="true" /> Dashboard
            </button>
            <div className="home-profile">
              <button
                className="home-profile__trigger"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
              >
                {avatarSrc ? <img src={avatarSrc} alt="" /> : <UserCircle2 aria-hidden="true" />}
                <span>{user?.full_name?.split(' ')[0] || 'Profile'}</span>
                <ChevronDown aria-hidden="true" />
              </button>
              {profileOpen && (
                <div className="home-profile__menu">
                  <button onClick={() => navigate('profile')}><UserCircle2 /> View profile</button>
                  <button onClick={logout}><LogOut /> Sign out</button>
                </div>
              )}
            </div>
            <button className="home-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="home-mobile-nav">
          <div className="home-mobile-nav__head">
            <span>Navigate Aca</span>
            <button onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button>
          </div>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => navigate(id)}><Icon /> {label}</button>
          ))}
          <button onClick={() => navigate('research')}><GraduationCap /> Research</button>
          <button onClick={() => navigate('dashboard')}><LayoutDashboard /> Dashboard</button>
        </div>
      )}

      <main id="home-content" className="home-content">{children}</main>
      <footer className="home-footer">
        <div className="home-footer__brand"><GraduationCap /><span><strong>Aca Collaboration</strong><small>Where academic progress finds its people.</small></span></div>
        <p>Built for thoughtful work across institutions and disciplines.</p>
      </footer>
    </div>
  );
};

export default HomeLayout;
