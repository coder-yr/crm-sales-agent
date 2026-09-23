import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { name: 'Dashboard', icon: 'dashboard', path: '/workspace-overview', roles: ['Owner', 'Manager'] },
  { name: 'Leads', icon: 'group', path: '/leads-management', roles: ['Owner', 'Manager'] },
  { name: 'Signals', icon: 'bolt', path: '/signals', roles: ['Owner', 'Manager'] },
  { name: 'Pipeline', icon: 'view_kanban', path: '/pipeline', roles: ['Owner', 'Manager'] },
  { name: 'Tasks', icon: 'add_task', path: '/tasks', roles: ['Owner', 'Manager'] },
  { name: 'Analytics', icon: 'analytics', path: '/reports-analytics', roles: ['Owner'] },
  { name: 'Properties', icon: 'domain', path: '/properties', roles: ['Owner', 'Manager'] },
  { name: 'Partners', icon: 'handshake', path: '/channel-partners', roles: ['Owner'] },
  { name: 'Team', icon: 'badge', path: '/employee-management', roles: ['Owner'] },
  { name: 'Settings', icon: 'settings', path: '/settings', roles: ['Owner', 'Manager'] },
];

export const SideNavBar: React.FC = () => {
  const navigate = useNavigate();
  const { user, tenant, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const filteredNavItems = navItems.filter(item => 
    !item.roles || (user && item.roles.includes(user.role === 'OWNER' ? 'Owner' : user.role === 'MANAGER' ? 'Manager' : 'Employee'))
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-50"
      style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--outline-variant)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--primary)', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}
        >
          <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>domain</span>
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--on-surface)', letterSpacing: '-0.01em' }}>
            {tenant?.name || 'EstateFlow'}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--outline)' }}>
            {tenant?.slug ? `${tenant.slug} CRM` : 'Elite CRM'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                isActive ? 'active-nav' : 'inactive-nav'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'var(--primary-container)' : 'transparent',
              color: isActive ? 'var(--primary-dark)' : 'var(--on-surface-variant)',
            })}
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-[20px] shrink-0 transition-all"
                  style={{
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                    color: isActive ? 'var(--primary)' : 'var(--outline)',
                  }}
                >
                  {item.icon}
                </span>
                <span className={`text-sm transition-colors ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-active-dot"
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--primary)' }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* CTA Button */}
      <div className="px-3 pb-4 shrink-0">
        <button
          onClick={() => navigate('/leads-management?add=true')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'var(--primary)', boxShadow: '0 4px 14px rgba(79,70,229,0.25)' }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Lead
        </button>
      </div>

      {/* Bottom Links */}
      <div className="px-3 pb-4 space-y-0.5 border-t shrink-0 pt-3" style={{ borderColor: 'var(--outline-variant)' }}>
        <NavLink
          to="/help"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-gray-50"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--outline)' }}>help</span>
          Help Center
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-red-50"
          style={{ color: '#dc2626' }}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Log Out
        </button>
      </div>

      {/* User Profile */}
      <div className="px-3 pb-5 shrink-0">
        <div 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 transition-all"
          style={{ background: 'var(--surface-container-low)' }}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            <img
              src={user?.avatar || "https://i.pravatar.cc/100"}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--on-surface)' }}>{user ? `${user.firstName} ${user.lastName}` : 'User'}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--outline)' }}>{user?.role || 'Member'}</p>
          </div>
          <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--outline)' }}>more_vert</span>
        </div>
      </div>
    </aside>
  );
};

