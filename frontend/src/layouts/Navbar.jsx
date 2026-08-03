import React, { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Bell, Search, CheckCheck, Inbox, ChevronRight } from 'lucide-react';

const Navbar = ({ setMobileOpen, onSearch, searchValue }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  const notificationMenuRef = useRef(null);

  useEffect(() => {
    if (!showDropdown) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!notificationMenuRef.current?.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setShowDropdown(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showDropdown]);

  const getNotificationLink = (link) => {
    if (!link) return null;
    const target = new URL(link, window.location.origin);
    if (target.origin !== window.location.origin) return target.href;

    const legacyDetail = target.pathname.match(/^\/(communities|events|projects)\/(\d+)\/?$/);
    if (legacyDetail) {
      target.pathname = `/${legacyDetail[1]}`;
      target.search = `?id=${legacyDetail[2]}`;
    } else if (target.pathname === '/communities/invitations') {
      target.pathname = '/communities';
      target.search = '';
    }

    return `${target.pathname}${target.search}${target.hash}`;
  };

  const openNotification = async (notification) => {
    if (!notification.is_read) await markAsRead(notification.id);
    setShowDropdown(false);

    const target = getNotificationLink(notification.link);
    if (target) window.location.assign(target);
  };

  return (
    <header className="h-16 sticky top-0 z-30 w-full backdrop-blur-2xl border-b bg-slate-50/85 border-slate-300 shadow-[0_4px_20px_rgba(37,99,235,0.05)]">
      {/* Decorative top border line */}
      <div className="absolute top-0 left-0 w-full h-[1px] opacity-60 bg-gradient-to-r from-transparent via-blue-300 to-transparent" />

      <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-10">
        
        <div className="flex items-center gap-4 flex-1">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2.5 rounded-xl text-slate-700 hover:bg-canvas-200 transition-colors border border-transparent hover:border-slate-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Search Bar (Glassy & Light) */}
          <div className="relative w-full max-w-md group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4.5 w-4.5 transition-colors text-slate-600" />
            </div>
            <input
              type="text"
              placeholder="Search people, projects, events, news..."
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border rounded-2xl text-sm placeholder-slate-500 focus:outline-none transition-all duration-300 shadow-sm font-medium bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-300 focus:bg-white focus:ring-[3px] focus:ring-blue-600/10"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          
          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationMenuRef}>
            <button
              type="button"
              onClick={() => setShowDropdown((open) => !open)}
              className="relative p-2.5 rounded-xl text-slate-700 hover:bg-canvas-200 transition-all duration-300 hover:shadow-sm border border-transparent hover:border-slate-300 group"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={showDropdown}
              aria-haspopup="menu"
            >
              <Bell className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] leading-none font-bold rounded-full border-2 border-canvas-50">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl shadow-[0_12px_40px_rgba(101,146,135,0.15)] bg-canvas-50/95 backdrop-blur-xl border border-slate-300 animate-slide-up origin-top-right overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-canvas-100/50">
                  <h3 className="font-bold text-canvas-800 font-display text-sm flex items-center gap-2">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-blue-100 text-blue-800">
                        {unreadCount} New
                      </span>
                    )}
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs font-semibold flex items-center gap-1 transition-colors text-blue-600 hover:text-blue-700"
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[28rem] overflow-y-auto overscroll-contain">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-canvas-100 flex items-center justify-center mb-3">
                        <Inbox className="h-6 w-6 text-slate-600" />
                      </div>
                      <p className="text-sm font-semibold">All caught up!</p>
                      <p className="text-xs mt-1">No new notifications right now.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-canvas-200/50">
                      {notifications.map(notif => (
                        <button
                          type="button"
                          key={notif.id}
                          className={`block w-full p-4 text-left transition-all duration-300 hover:bg-slate-50 cursor-pointer group ${!notif.is_read ? 'bg-blue-50/60' : 'bg-transparent'}`}
                          onClick={() => openNotification(notif)}
                        >
                          <div className="flex gap-3">
                            <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!notif.is_read ? 'bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.4)]' : 'bg-transparent shadow-none'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-tight ${!notif.is_read ? 'font-bold text-canvas-900' : 'font-semibold text-slate-800'}`}>
                                {notif.title || 'Notification'}
                              </p>
                              <p className="text-xs leading-relaxed text-slate-600 mt-1">
                                {notif.content}
                              </p>
                              <p className="text-[10px] font-semibold uppercase tracking-widest mt-2">
                                {new Date(notif.created_at).toLocaleString()}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all self-center" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
