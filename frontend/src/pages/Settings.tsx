import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { tenantService } from '../services/tenant.service';
import { pipelineService } from '../services/pipeline.service';
import { useAuthStore } from '../store/authStore';

const INITIAL_STAGES = [
  { id: 1, name: 'Initial Contact', status: 'Active', desc: 'First touch with potential lead', rules: 2, icon: 'mail', color: '#4F46E5', bg: '#eef2ff', active: false },
  { id: 2, name: 'Property Viewing', status: 'Active', desc: 'Scheduled tour of inventory', rules: 1, icon: 'visibility', color: '#059669', bg: '#ecfdf5', active: false },
  { id: 3, name: 'Offer Submitted', status: 'Focused', desc: 'Legal offer paperwork initiated', rules: 4, icon: 'edit', color: '#4F46E5', bg: '#eef2ff', active: true },
  { id: 4, name: 'Closing Underway', status: 'Active', desc: 'Escrow and final documentation', rules: 0, icon: 'task_alt', color: '#059669', bg: '#ecfdf5', active: false },
];

const ALL_PERMS = ['Manage Users', 'View Analytics', 'Configure Pipelines', 'Edit Billing', 'Delete Leads', 'Manage Leads', 'Assign Tasks', 'View Team Reports', 'Edit Property Listings', 'View Own Leads', 'Update Task Status', 'Log Activities', 'Add Notes'];

const INITIAL_ROLES = [
  { role: 'Owner', desc: 'Full administrative access to all modules and billing.', permissions: ['Manage Users', 'View Analytics', 'Configure Pipelines', 'Edit Billing', 'Delete Leads'], count: 1 },
  { role: 'Manager', desc: 'Limited administrative access for team management.', permissions: ['Manage Leads', 'Assign Tasks', 'View Team Reports', 'Edit Property Listings'], count: 3 },
  { role: 'Agent', desc: 'Individual access to assigned leads and tasks.', permissions: ['View Own Leads', 'Update Task Status', 'Log Activities', 'Add Notes'], count: 12 },
];

export const Settings: React.FC = () => {
  const { setTenant } = useAuthStore();
  const [activeTab, setActiveTab] = useState('Company');
  const tabs = ['Company', 'Pipeline Setup', 'Roles & Permissions', 'Billing'];

  // Company state
  const [company, setCompany] = useState({ 
    name: '', 
    slug: '', 
    email: '', 
    phone: '' 
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTenant = async () => {
      const res = await tenantService.getMyTenant();
      if (res.success) {
        setTenant(res.data);
        setCompany({
          name: res.data.name || '',
          slug: res.data.slug || '',
          email: res.data.supportEmail || '',
          phone: res.data.officialPhone || ''
        });
      }
    };
    fetchTenant();
  }, [setTenant]);

  useEffect(() => {
    const fetchStages = async () => {
      const res = await pipelineService.getStages();
      if (res.success) {
        setStages(res.data as any);
      }
    };
    fetchStages();
  }, []);

  // Pipeline state
  const [stages, setStages] = useState(INITIAL_STAGES);
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStage, setNewStage] = useState({ name: '', desc: '' });

  // Roles state
  const [roles, setRoles] = useState(INITIAL_ROLES);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await tenantService.updateMyTenant({
        name: company.name,
        slug: company.slug,
        supportEmail: company.email,
        officialPhone: company.phone
      });
      if (res.success) {
        setTenant(res.data);
        toast.success('Settings saved successfully!');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStage = async () => {
    if (!newStage.name.trim()) { toast.error('Stage name is required'); return; }
    try {
      const res = await pipelineService.createStage({ 
        name: newStage.name, 
        order: stages.length 
      });
      if (res.success) {
        setStages(prev => [...prev, res.data as any]);
        setNewStage({ name: '', desc: '' });
        setShowAddStage(false);
        toast.success(`Stage "${newStage.name}" added!`);
      }
    } catch (error) {
      toast.error('Failed to create stage');
    }
  };

  const togglePermission = (roleIdx: number, perm: string) => {
    setRoles(prev => prev.map((r, i) => {
      if (i !== roleIdx) return r;
      const has = r.permissions.includes(perm);
      return { ...r, permissions: has ? r.permissions.filter(p => p !== perm) : [...r.permissions, perm] };
    }));
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between border-b pb-8" 
        style={{ borderColor: 'var(--surface-container)' }}
      >
        <div>
          <h1 className="text-[30px] font-semibold leading-tight" style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
            Workspace Settings
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Configure your workspace, pipelines, and team permissions.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2">
          {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving…' : 'Save All Changes'}
        </button>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-8 border-b" 
        style={{ borderColor: 'var(--surface-container)' }}
      >
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`pb-4 text-sm font-bold transition-all relative ${
              activeTab === t ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t}
            {activeTab === t && (
              <motion.div layoutId="settingTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'Pipeline Setup' && (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-12 gap-8"
          >
            {/* Pipeline Configuration */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: 'var(--on-surface)' }}>Sales Pipeline Stages</h3>
                <button onClick={() => setShowAddStage(true)} className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-all">
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Stage
                </button>
              </div>

              {/* Add Stage Modal */}
              <AnimatePresence>
                {showAddStage && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="card p-6 border-primary/30 bg-primary/5 space-y-4">
                    <h4 className="text-sm font-black text-on-surface">New Pipeline Stage</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <input value={newStage.name} onChange={e => setNewStage(s => ({ ...s, name: e.target.value }))}
                        placeholder="Stage name" className="px-4 py-3 rounded-xl border border-outline-variant bg-white outline-none text-sm font-medium focus:border-primary transition-all" />
                      <input value={newStage.desc} onChange={e => setNewStage(s => ({ ...s, desc: e.target.value }))}
                        placeholder="Description" className="px-4 py-3 rounded-xl border border-outline-variant bg-white outline-none text-sm font-medium focus:border-primary transition-all" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleAddStage} className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest">Add Stage</button>
                      <button onClick={() => setShowAddStage(false)} className="px-6 py-2.5 border border-outline-variant rounded-xl text-xs font-black uppercase tracking-widest text-on-surface">Cancel</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                {stages.map((s) => (
                  <motion.div
                    key={s.id}
                    whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                    className={`card p-5 flex items-center gap-5 transition-all ${
                      s.active ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/5 bg-primary/5' : ''
                    }`}
                  >
                    <span className="material-symbols-outlined text-outline">drag_indicator</span>
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                          <span className="material-symbols-outlined text-[20px]" style={{ color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-0.5">
                            <span className="font-bold text-sm" style={{ color: 'var(--on-surface)' }}>{s.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              s.active ? 'bg-primary text-white' : 'bg-secondary-container text-secondary'
                            }`}>{s.status}</span>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{s.desc || 'No description'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--outline)' }}>Automation</p>
                          <p className={`text-xs font-bold ${s.rules > 0 ? 'text-primary' : 'text-on-surface-variant'}`}>
                            {s.rules > 0 ? `${s.rules} Rules Active` : 'No Rules'}
                          </p>
                        </div>
                        <button onClick={() => setStages(prev => prev.filter(x => x.id !== s.id))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 text-outline transition-all">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                <motion.div whileHover={{ scale: 1.01 }} onClick={() => setShowAddStage(true)}
                  className="border-2 border-dashed border-outline-variant rounded-2xl py-8 flex flex-col items-center justify-center text-outline hover:border-primary hover:text-primary transition-all cursor-pointer bg-white/50">
                  <span className="material-symbols-outlined text-3xl mb-2">add_circle</span>
                  <span className="font-bold text-sm uppercase tracking-wider">Create Custom Stage</span>
                </motion.div>
              </div>
            </div>

            {/* Sidebar Automation Panel */}
            <div className="col-span-12 lg:col-span-4">
              <div className="card p-8 sticky top-24 border-primary/20 bg-white shadow-xl">
                <div className="flex items-center justify-between mb-8 pb-4 border-b" style={{ borderColor: 'var(--surface-container)' }}>
                  <h4 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--on-surface)' }}>
                    Stage Logic: <span className="text-primary">Offer Submitted</span>
                  </h4>
                  <span className="material-symbols-outlined text-primary text-sm cursor-pointer hover:scale-110 transition-transform">info</span>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-3" style={{ color: 'var(--outline)' }}>Entry Trigger</label>
                    <div className="p-4 rounded-xl flex items-center gap-3 border border-primary/10 bg-primary/5 text-primary">
                      <span className="material-symbols-outlined text-[18px]">bolt</span>
                      <span className="text-xs font-bold">When deal enters this stage</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-4" style={{ color: 'var(--outline)' }}>Automated Actions</label>
                    <div className="space-y-4">
                      {[
                        { title: 'Email Prospect', desc: 'Template: "Offer Confirmation"', active: true, icon: 'mail', iconColor: '#4F46E5' },
                        { title: 'Notify Attorney', desc: 'Slack Alert: #legal-alerts', active: true, icon: 'notifications', iconColor: '#d97706' },
                        { title: 'Task: Signature Follow-up', desc: 'Assign to: Account Owner', active: false, icon: 'task_alt', iconColor: '#059669' },
                      ].map((rule, i) => (
                        <div key={i} className="p-4 rounded-xl bg-surface-container-low border hover:shadow-md transition-all group border-outline-variant">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <span className="material-symbols-outlined text-[18px]" style={{ color: rule.iconColor }}>{rule.icon}</span>
                              <span className="text-xs font-bold" style={{ color: 'var(--on-surface)' }}>{rule.title}</span>
                            </div>
                            <div className={`w-8 h-4 rounded-full relative cursor-pointer transition-all ${rule.active ? 'bg-primary' : 'bg-outline-variant'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${rule.active ? 'right-0.5' : 'left-0.5'}`} />
                            </div>
                          </div>
                          <p className="text-[10px] font-medium" style={{ color: 'var(--on-surface-variant)' }}>{rule.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="w-full py-4 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2 group">
                    <span className="material-symbols-outlined text-sm group-hover:scale-125 transition-transform">add</span>
                    Configure New Action
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'Roles & Permissions' && (
          <motion.div key="roles" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div className="flex justify-between items-center">
               <h3 className="text-lg font-bold">Role-Based Access Control</h3>
               <button className="btn-secondary py-2 px-4 text-xs font-black uppercase tracking-widest">+ Create Custom Role</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {roles.map((role, roleIdx) => (
                 <div key={role.role} className="card p-6 flex flex-col hover:border-primary transition-all group">
                    <div className="flex justify-between items-start mb-4">
                       <div className="p-3 bg-primary/5 rounded-2xl">
                          <span className="material-symbols-outlined text-primary">shield_person</span>
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-widest text-outline">{role.count} Users</span>
                    </div>
                    <h4 className="text-base font-black text-on-surface mb-2">{role.role}</h4>
                    <p className="text-xs text-on-surface-variant font-medium mb-4 line-clamp-2">{role.desc}</p>
                    
                    <div className="space-y-2 flex-1">
                       <p className="text-[9px] font-black uppercase tracking-widest text-outline mb-3">Permissions</p>
                       {editingRole === role.role ? (
                         <div className="space-y-2">
                           {ALL_PERMS.map(perm => {
                             const active = role.permissions.includes(perm);
                             return (
                               <button key={perm} onClick={() => togglePermission(roleIdx, perm)}
                                 className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                                   active ? 'bg-primary/10 text-primary' : 'bg-surface-container text-outline hover:bg-surface-container-high'
                                 }`}>
                                 <span>{perm}</span>
                                 <span className={`material-symbols-outlined text-sm ${active ? 'text-primary' : 'text-outline'}`}>
                                   {active ? 'check_circle' : 'radio_button_unchecked'}
                                 </span>
                               </button>
                             );
                           })}
                         </div>
                       ) : (
                         <div className="flex flex-wrap gap-2">
                           {role.permissions.slice(0, 3).map(p => (
                             <span key={p} className="text-[9px] px-2 py-1 bg-surface-container rounded-lg font-bold text-outline group-hover:bg-primary-container group-hover:text-primary transition-colors">{p}</span>
                           ))}
                           {role.permissions.length > 3 && <span className="text-[9px] px-2 py-1 text-outline font-bold">+{role.permissions.length - 3} more</span>}
                         </div>
                       )}
                    </div>
                    
                    <button onClick={() => setEditingRole(editingRole === role.role ? null : role.role)}
                      className="w-full mt-6 py-3 bg-surface-container-low hover:bg-white border border-outline-variant rounded-xl text-[10px] font-black uppercase tracking-widest text-on-surface transition-all">
                      {editingRole === role.role ? 'Done Editing' : 'Edit Permissions'}
                    </button>
                 </div>
               ))}
            </div>

            <div className="card p-8 bg-surface-container-low">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                     <span className="material-symbols-outlined">security_update_good</span>
                  </div>
                  <div>
                     <h4 className="text-sm font-black text-on-surface uppercase tracking-tight">Security Audit</h4>
                     <p className="text-xs text-outline font-medium">Last permission audit completed on April 20, 2024</p>
                  </div>
               </div>
               <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                  Roles and permissions are enforced globally across all modules. Changes to role permissions will take effect for all users assigned to that role upon their next login session.
               </p>
            </div>
          </motion.div>
        )}

        {activeTab === 'Company' && (
          <motion.div key="company" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl space-y-10 py-4">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline">Company Logo</label>
                <div className="w-32 h-32 rounded-3xl bg-surface-container border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-outline cursor-pointer hover:border-primary hover:text-primary transition-all">
                  <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                  <span className="text-[10px] font-black mt-2 uppercase tracking-widest">Upload</span>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline">Legal Entity Name</label>
                  <input className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all"
                    value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline">Workspace URL</label>
                  <div className="flex items-center gap-2">
                    <input className="flex-1 px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all"
                      value={company.slug} onChange={e => setCompany(c => ({ ...c, slug: e.target.value }))} />
                    <span className="text-sm font-bold text-outline">.estateflow.com</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6 pt-8 border-t border-outline-variant">
              <h3 className="text-lg font-bold">Contact Information</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline">Support Email</label>
                  <input className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all"
                    value={company.email} onChange={e => setCompany(c => ({ ...c, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline">Official Phone</label>
                  <input className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all"
                    value={company.phone} onChange={e => setCompany(c => ({ ...c, phone: e.target.value }))} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'Billing' && (
          <motion.div
             key="billing"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             className="space-y-10 py-4"
          >
            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2 space-y-8">
                <div className="card p-8 bg-primary text-white relative overflow-hidden shadow-2xl">
                   <div className="relative z-10 flex justify-between items-start">
                     <div>
                       <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Current Plan</p>
                       <h3 className="text-3xl font-black">Enterprise Pro</h3>
                       <p className="text-indigo-100 text-sm font-medium mt-2">Next billing date: Dec 24, 2024</p>
                     </div>
                     <div className="text-right">
                       <h4 className="text-4xl font-black">₹39,999<span className="text-xl font-bold opacity-60">/mo</span></h4>
                       <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">Yearly Billing</span>
                     </div>
                   </div>
                   <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                </div>

                <div className="card overflow-hidden">
                   <div className="px-8 py-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                     <h4 className="text-sm font-black uppercase tracking-widest">Payment Methods</h4>
                     <button className="text-primary text-xs font-black uppercase tracking-widest">+ Add New</button>
                   </div>
                   <div className="p-8">
                      <div className="flex items-center gap-6 p-6 border border-primary/20 bg-primary/5 rounded-3xl">
                        <div className="w-16 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                           <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" className="h-6" alt="Mastercard" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-on-surface">Mastercard ending in 4421</p>
                          <p className="text-xs text-outline font-medium">Expires 08/2026 • Default</p>
                        </div>
                        <span className="chip chip-indigo">PRIMARY</span>
                      </div>
                   </div>
                </div>
              </div>

              <div className="col-span-1 space-y-8">
                 <div className="card p-8">
                   <h4 className="text-[10px] font-black text-outline uppercase tracking-widest mb-6">Subscription Usage</h4>
                   <div className="space-y-6">
                      {[
                        { label: 'Active Seats', val: '18 / 25', perc: '72%' },
                        { label: 'Lead Storage', val: '4.2k / 10k', perc: '42%' },
                        { label: 'API Calls', val: '85k / 1M', perc: '8.5%' },
                      ].map(usage => (
                        <div key={usage.label}>
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-bold text-on-surface">{usage.label}</span>
                             <span className="text-xs font-black text-primary">{usage.val}</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: usage.perc }} />
                          </div>
                        </div>
                      ))}
                   </div>
                   <button className="w-full mt-10 py-4 bg-surface-container-low border border-outline-variant rounded-2xl font-black text-xs uppercase tracking-widest text-on-surface hover:bg-white transition-all">Change Plan</button>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

