import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { notificationsService } from '../services/notifications.service';
import type { Notification } from '../services/notifications.service';

// Icon map based on notification title keywords
const getNotifMeta = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('lead'))    return { icon: 'person_add',   color: '#4F46E5', bg: '#eef2ff' };
  if (t.includes('task'))    return { icon: 'task_alt',     color: '#059669', bg: '#ecfdf5' };
  if (t.includes('partner')) return { icon: 'handshake',    color: '#d97706', bg: '#fffbeb' };
  if (t.includes('deal') || t.includes('pipeline')) return { icon: 'trending_up', color: '#7c3aed', bg: '#f5f3ff' };
  if (t.includes('assign'))  return { icon: 'assignment_ind', color: '#0891b2', bg: '#ecfeff' };
  return { icon: 'notifications', color: '#6b7280', bg: '#f3f4f6' };
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
};

export const TopAppBar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [showNotifs, setShowNotifs]       = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationsService.getNotifications();
      const list = Array.isArray(res?.data) ? res.data
        : Array.isArray(res) ? res : [];
      setNotifications(list);
    } catch {
      // silently fail — not critical
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and every 60s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Fetch when panel opens
  useEffect(() => {
    if (showNotifs) fetchNotifications();
  }, [showNotifs, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try { await notificationsService.markAsRead(id); } catch { /* revert not critical */ }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try { await notificationsService.markAllAsRead(); } catch { /* revert not critical */ }
  };

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const initials    = user ? `${user.firstName[0]}${user.lastName[0]}` : 'U';

  return (
    <header
      className="sticky top-0 w-full z-40 flex items-center h-16 px-8 gap-6"
      style={{
        background: 'rgba(252, 248, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--outline-variant)',
      }}
    >
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px]" style={{ color: 'var(--outline)' }}>
          search
        </span>
        <input
          type="text"
          placeholder="Search leads, properties..."
          className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none transition-all"
          style={{ background: 'var(--surface-container)', border: '1px solid transparent', color: 'var(--on-surface)', fontFamily: 'Inter' }}
          onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(79,70,229,0.15)'; }}
          onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      <div className="flex-1" />

      {/* Action Icons */}
      <div className="flex items-center gap-1">

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all"
            style={{
              color: showNotifs ? 'var(--primary)' : 'var(--on-surface-variant)',
              background: showNotifs ? 'var(--primary-container)' : 'transparent',
            }}
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-4 h-4 rounded-full text-white flex items-center justify-center font-black border-2 border-white"
                style={{ background: 'var(--primary)', fontSize: '9px' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-outline-variant overflow-hidden z-50"
              >
                {/* Panel Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
                  <div>
                    <p className="text-sm font-black text-on-surface">Notifications</p>
                    <p className="text-[10px] text-outline font-medium">{unreadCount} unread</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {loading && <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-[10px] font-black text-primary uppercase tracking-widest hover:opacity-70 transition-opacity">
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                {/* Notification List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant">
                  {notifications.length === 0 ? (
                    <div className="py-12 flex flex-col items-center gap-3 text-outline">
                      <span className="material-symbols-outlined text-4xl">notifications_off</span>
                      <p className="text-xs font-bold">All caught up!</p>
                    </div>
                  ) : (
                    notifications.map(n => {
                      const meta = getNotifMeta(n.title);
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleMarkRead(n.id)}
                          className={`w-full flex items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-container-low ${!n.isRead ? 'bg-primary/[0.03]' : ''}`}
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
                            <span className="material-symbols-outlined text-[18px]" style={{ color: meta.color }}>{meta.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-xs truncate ${!n.isRead ? 'font-black text-on-surface' : 'font-bold text-on-surface-variant'}`}>{n.title}</p>
                              {!n.isRead && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--primary)' }} />}
                            </div>
                            <p className="text-[11px] text-outline font-medium mt-0.5 truncate">{n.message}</p>
                            <p className="text-[10px] text-outline font-medium mt-1">{timeAgo(n.createdAt)}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Help */}
        <button
          onClick={() => navigate('/help')}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
          style={{ color: 'var(--on-surface-variant)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-container)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          title="Help Center"
        >
          <span className="material-symbols-outlined text-[20px]">help_outline</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 mx-2" style={{ background: 'var(--outline-variant)' }} />

        {/* User Info (from authStore) */}
        <div
          className="flex items-center gap-2.5 cursor-pointer px-2 py-1.5 rounded-xl hover:bg-surface-container transition-all"
          onClick={() => navigate('/settings')}
          title={displayName}
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--on-surface)' }}>{displayName}</p>
            <p className="text-[10px] capitalize" style={{ color: 'var(--outline)' }}>{user?.role?.toLowerCase() ?? 'Member'}</p>
          </div>
          <div className="relative shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={displayName} className="w-8 h-8 rounded-full object-cover" style={{ border: '2px solid var(--primary-container)' }} />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ background: 'var(--primary)' }}>
                {initials}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: '#10b981' }} />
          </div>
        </div>

      </div>
    </header>
  );
};
