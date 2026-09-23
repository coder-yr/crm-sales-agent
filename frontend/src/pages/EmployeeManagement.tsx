import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUsersStore } from '../store/usersStore';
import { usersService } from '../services/users.service';
import { toast } from 'react-hot-toast';

export const EmployeeManagement: React.FC = () => {
  const { users, setUsers, addUser } = useUsersStore();
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('Luxury Specialist');
  const [access, setAccess] = useState('Agent');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await usersService.getUsers();
        if (response.success) {
          setUsers(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch users', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [setUsers]);

  const filtered = users.filter(e => 
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) || 
    e.role.toLowerCase().includes(search.toLowerCase())
  );

  const [inviteResult, setInviteResult] = useState<{ email: string; link: string } | null>(null);

  const handleInvite = async () => {
    if (!email || !firstName || !lastName) return;
    setLoading(true);

    // Map Access Level to System Role
    const systemRole = 
      access === 'Admin' ? 'OWNER' : 
      access === 'Manager' ? 'MANAGER' : 
      'EMPLOYEE';

    try {
      const response = await usersService.inviteUser({
        email,
        firstName,
        lastName,
        role: systemRole, // System role (OWNER, MANAGER, EMPLOYEE)
        title: role,      // Job title (Luxury Specialist, etc.)
      });
      if (response.success) {
        addUser(response.data);
        setInviteResult({ email: response.data.email, link: response.data.inviteLink });
        setEmail('');
        setFirstName('');
        setLastName('');
        toast.success('Invitation generated successfully!');
      }
    } catch (error) {
      console.error('Failed to invite user', error);
      toast.error('Failed to generate invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' as any }}
      className="p-8 space-y-8"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[30px] font-semibold" style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
            Elite Team Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>
            Manage permissions, track performance, and grow your high-velocity team.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative w-64">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-outline">search</span>
            <input
              type="text"
              placeholder="Search team members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white border border-outline-variant rounded-xl text-sm font-medium outline-none focus:border-primary transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Invite Member
          </button>
        </div>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Total Members', val: users.length.toString(), icon: 'groups', delta: '+2 this month' },
          { label: 'Active Agents', val: users.filter(u => u.status === 'ACTIVE').length.toString(), icon: 'badge', delta: '85% active' },
          { label: 'Pending Invites', val: users.filter(u => u.status === 'INVITED').length.toString(), icon: 'mail', delta: 'Requires action' },
          { label: 'Avg. Performance', val: '92%', icon: 'trending_up', delta: '+4.2% YoY' },
        ].map(stat => (
          <div key={stat.label} className="card p-6 flex items-start justify-between bg-white border border-outline-variant">
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-on-surface mt-1">{stat.val}</p>
              <p className="text-[11px] font-bold text-primary mt-2">{stat.delta}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-outline">
              <span className="material-symbols-outlined text-xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Team Table */}
      <div className="card overflow-hidden bg-white border border-outline-variant">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-low/50 border-b border-outline-variant">
              {['Member', 'Role & Permissions', 'Status', 'Performance', 'Activity', ''].map(h => (
                <th key={h} className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-outline">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading ? (
              <tr><td colSpan={6} className="px-8 py-12 text-center text-outline">Loading team...</td></tr>
            ) : filtered.map(emp => (
              <tr key={emp.id} className="group hover:bg-primary-container/10 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <img className="w-10 h-10 rounded-2xl object-cover ring-2 ring-white shadow-md" src={`https://i.pravatar.cc/100?u=${emp.id}`} alt={`${emp.firstName} ${emp.lastName}`} />
                    <div>
                      <p className="text-sm font-black text-on-surface group-hover:text-primary transition-colors">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-outline font-medium">{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-on-surface-variant">{emp.title || 'Team Member'}</span>
                    <span className={`text-[9px] w-fit px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest ${
                      emp.role === 'OWNER' || emp.role === 'MANAGER' ? 'bg-primary/10 text-primary' : 'bg-surface-container text-outline'
                    }`}>
                      {emp.role}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <select 
                    value={emp.status || 'ACTIVE'}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      try {
                        const response = await usersService.updateUserStatus(emp.id, newStatus);
                        if (response.success) {
                          setUsers(users.map(u => u.id === emp.id ? { ...u, status: newStatus as any } : u));
                        }
                      } catch (error) {
                        console.error('Failed to update status', error);
                      }
                    }}
                    className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border outline-none transition-all cursor-pointer ${
                      emp.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      emp.status === 'SUSPENDED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="INVITED" disabled>Invited</option>
                  </select>
                </td>
                <td className="px-8 py-5">
                   <div className="flex items-center gap-3">
                     <span className="text-sm font-black text-on-surface">90%</span>
                     <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: '90%' }} className="h-full bg-primary" />
                     </div>
                   </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-xs font-bold text-on-surface-variant">12 Deals</span>
                </td>
                <td className="px-8 py-5 text-right">
                  <button className="w-10 h-10 flex items-center justify-center rounded-xl text-outline hover:bg-white hover:text-primary hover:shadow-md transition-all">
                    <span className="material-symbols-outlined">more_horiz</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
              onClick={() => setShowInviteModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <header>
                  <h3 className="text-2xl font-black text-on-surface">Invite Elite Member</h3>
                  <p className="text-sm font-medium text-outline mt-1">Add high-performing talent to your workspace.</p>
                </header>

                {inviteResult ? (
                  <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-[32px]">mail</span>
                    </div>
                    <div className="text-center space-y-2">
                      <h4 className="text-lg font-black text-on-surface">Invitation Created!</h4>
                      <p className="text-sm text-outline font-medium">An invitation link has been generated for <b>{inviteResult.email}</b>.</p>
                    </div>
                    <div className="p-4 bg-surface-container rounded-2xl border border-outline-variant break-all">
                      <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">Activation Link</p>
                      <code className="text-xs font-bold text-primary">{inviteResult.link}</code>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(inviteResult.link);
                          toast.success('Link copied to clipboard!');
                        }}
                        className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        Copy Link
                      </button>
                      <button 
                        onClick={() => {
                          setInviteResult(null);
                          setShowInviteModal(false);
                        }}
                        className="flex-1 py-4 bg-surface-container text-on-surface rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-outline-variant transition-all"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-outline">First Name</label>
                          <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="John" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-outline">Last Name</label>
                          <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="Doe" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline">Email Address</label>
                        <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="agent@estateflow.com" />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-outline">Assigned Role</label>
                          <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all appearance-none">
                            <option>Luxury Specialist</option>
                            <option>Senior Broker</option>
                            <option>Operations Manager</option>
                            <option>Junior Associate</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-outline">Access Level</label>
                          <select value={access} onChange={e => setAccess(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all appearance-none">
                            <option>Agent</option>
                            <option>Manager</option>
                            <option>Admin</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setShowInviteModal(false)} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-outline hover:text-on-surface transition-all">Cancel</button>
                      <button 
                        onClick={handleInvite} 
                        disabled={loading}
                        className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Sending...' : 'Send Invitation'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

