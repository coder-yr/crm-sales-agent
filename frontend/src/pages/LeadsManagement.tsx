import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useCRMStore } from '../store/crmStore';
import { useUsersStore } from '../store/usersStore';
import { leadsService } from '../services/leads.service';
import { usersService } from '../services/users.service';
import { pipelineService } from '../services/pipeline.service';

export const LeadsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { leads, setLeads, addLead, pipelineStages, setPipelineStages, filters, setFilters, pagination } = useCRMStore();
  const { users, setUsers } = useUsersStore();
  
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newSource, setNewSource] = useState('Web Admin');
  const [newInterestedProperty, setNewInterestedProperty] = useState('');
  const [newPreapprovalStatus, setNewPreapprovalStatus] = useState('');
  const [newExpectedCloseDate, setNewExpectedCloseDate] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const fetchData = async (page = 1, limit = 50) => {
    setLoading(true);
    try {
      const [leadsRes, stagesRes, usersRes] = await Promise.all([
        leadsService.getLeads({ 
          page, 
          limit, 
          stageId: filters.status !== 'All' ? filters.status : undefined,
          search: filters.search || undefined
        }),
        pipelineService.getStages(),
        usersService.getUsers()
      ]);
      
      if (leadsRes.success) {
        // The backend returns { success: true, data: Lead[], meta: { ... } }
        // leadsRes is the whole response body because of how apiClient is likely configured
        const res = leadsRes as any;
        setLeads(res.data, res.meta);
      }
      if (stagesRes.success) setPipelineStages(stagesRes.data);
      if (usersRes.success) setUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to fetch CRM data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1, pagination.limit);
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [filters.status, filters.search]);

  const handleAssignLead = async (leadId: string, assigneeId: string) => {
    try {
      const response = await leadsService.assignLead(leadId, assigneeId);
      if (response.success) {
        setLeads(leads.map(l => l.id === leadId ? response.data : l));
      }
    } catch (error) {
      console.error('Failed to assign lead', error);
    }
    setAssigningId(null);
  };

  // Search and stage filtering are now handled by the backend
  const filtered = leads;

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const allSelected = filtered.length > 0 && filtered.every(l => selected.includes(l.id));

  const handleCreateLead = async () => {
    if (!firstName || !lastName || !newEmail) return;

    if (pipelineStages.length === 0) {
      toast.error('Please create a Pipeline Stage in Settings first');
      return;
    }
    
    try {
      const response = await leadsService.createLead({
        firstName,
        lastName,
        email: newEmail,
        phone: newPhone,
        notes: newNotes,
        budget: parseFloat(newBudget) || 0,
        source: newSource,
        interestedProperty: newInterestedProperty,
        preapprovalStatus: newPreapprovalStatus,
        expectedCloseDate: newExpectedCloseDate ? new Date(newExpectedCloseDate).toISOString() : undefined,
        location: newLocation,
        stageId: pipelineStages[0].id,
      });
      
      if (response.success) {
        addLead(response.data);
        setFirstName('');
        setLastName('');
        setNewEmail('');
        setNewPhone('');
        setNewNotes('');
        setNewBudget('');
        setNewSource('Web Admin');
        setNewInterestedProperty('');
        setNewPreapprovalStatus('');
        setNewExpectedCloseDate('');
        setNewLocation('');
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Failed to create lead', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const response = await leadsService.bulkUpload(file);
      if (response.success) {
        // Refresh leads
        fetchData(1, pagination.limit);
        alert(`${response.data.count} leads imported successfully!`);
      } else {
        alert('Failed to import leads. Please check the file format.');
      }
    } catch (error) {
      console.error('Bulk upload failed', error);
      alert('An error occurred during bulk upload.');
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  const getStageColor = (stageId: string) => {
    const stage = pipelineStages.find(s => s.id === stageId);
    return stage?.color || '#CBD5E1';
  };

  const getStageName = (stageId: string) => {
    const stage = pipelineStages.find(s => s.id === stageId);
    return stage?.name || 'Unknown';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' as any }}
      className="p-4 md:p-8 space-y-6"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-[30px] font-semibold text-on-surface tracking-tight">
            Leads Management
          </h1>
          <p className="text-xs md:text-sm mt-1 text-outline">
            {pagination.total} active leads · {loading ? 'Refreshing...' : 'Updated just now'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <input
            type="file"
            id="bulk-import"
            className="hidden"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => document.getElementById('bulk-import')?.click()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm font-bold transition-all btn-secondary"
          >
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            <span className="hidden sm:inline">Import</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm font-bold transition-all btn-secondary">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            Filters
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Add New Lead
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 md:gap-6 p-4 md:p-6 border-b border-outline-variant bg-surface-container-low">
          {/* Search */}
          <div className="relative w-full lg:max-w-sm">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-outline">search</span>
            <input
              type="text"
              placeholder="Search leads..."
              value={filters.search}
              onChange={e => setFilters({ search: e.target.value })}
              className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant rounded-2xl text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>

          {/* Status filters */}
          <div className="flex gap-1 p-1 bg-surface-container-highest rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => setFilters({ status: 'All' })}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filters.status === 'All' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface'
              }`}
            >
              All
            </button>
            {pipelineStages.map(s => (
              <button
                key={s.id}
                onClick={() => setFilters({ status: s.id })}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filters.status === s.id ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 lg:ml-auto">
            {selected.length > 0 && (
              <span className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-primary-container text-primary uppercase tracking-widest">
                {selected.length} selected
              </span>
            )}
            <button className="flex-1 lg:flex-none w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-outline-variant text-outline hover:text-primary transition-all shadow-sm">
              <span className="material-symbols-outlined text-[20px]">download</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-20 text-center text-outline font-bold">Initialising Lead Engine...</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="pl-6 pr-4 py-4 w-12 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => allSelected ? setSelected([]) : setSelected(filtered.map(l => l.id))}
                      className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  {['Lead', 'Stage', 'Assigned Agent', 'Source', 'Created', 'Notes', ''].map(h => (
                    <th key={h} className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest text-outline">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map(lead => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="group hover:bg-primary-container/20 transition-colors cursor-pointer"
                  >
                    <td className="pl-6 pr-4 py-4" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.includes(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{lead.firstName} {lead.lastName}</span>
                        <span className="text-xs text-outline font-medium">{lead.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="chip" style={{ backgroundColor: getStageColor(lead.stageId) + '20', color: getStageColor(lead.stageId) }}>{getStageName(lead.stageId)}</span>
                    </td>
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <div className="relative group/assign">
                        <div 
                          onClick={() => setAssigningId(assigningId === lead.id ? null : lead.id)}
                          className="flex items-center gap-2.5 hover:bg-surface-container px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          <img 
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm" 
                            src={`https://i.pravatar.cc/100?u=${lead.assigneeId || 'unassigned'}`} 
                            alt="Agent" 
                          />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-on-surface uppercase tracking-tight">
                              {users.find(u => u.id === lead.assigneeId)?.firstName || 'Unassigned'}
                            </span>
                            <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Assign</span>
                          </div>
                        </div>

                        <AnimatePresence>
                          {assigningId === lead.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setAssigningId(null)} />
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-outline-variant z-50 overflow-hidden"
                              >
                                <div className="p-2 border-b border-outline-variant bg-surface-container-low">
                                  <p className="text-[10px] font-black text-outline uppercase tracking-widest px-3 py-1">Select Agent</p>
                                </div>
                                <div className="max-h-60 overflow-y-auto p-1">
                                  {users.map(user => (
                                    <button
                                      key={user.id}
                                      onClick={() => handleAssignLead(lead.id, user.id)}
                                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-primary/5 text-left transition-all group/item"
                                    >
                                      <img className="w-8 h-8 rounded-lg object-cover" src={`https://i.pravatar.cc/100?u=${user.id}`} alt="" />
                                      <div>
                                        <p className="text-xs font-bold text-on-surface group-hover/item:text-primary transition-colors">{user.firstName} {user.lastName}</p>
                                        <p className="text-[10px] text-outline font-medium">{user.role}</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-bold text-on-surface-variant">{lead.source}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-medium text-outline">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs text-outline line-clamp-1 max-w-[200px]">{lead.notes}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button className="w-9 h-9 flex items-center justify-center rounded-xl text-outline hover:bg-white hover:text-primary hover:shadow-md transition-all">
                        <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 md:px-8 py-6 bg-surface-container-low/30 border-t border-outline-variant">
          <p className="text-[10px] font-black text-outline uppercase tracking-widest text-center sm:text-left">
            Showing <span className="text-on-surface">{Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-on-surface">{pagination.total}</span> Elite Leads
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={pagination.page <= 1}
              onClick={() => fetchData(pagination.page - 1, pagination.limit)}
              className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl border border-outline-variant bg-white text-outline hover:text-primary transition-all shadow-sm ${pagination.page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <div className="flex items-center gap-1">
              {[...Array(pagination.totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => fetchData(i + 1, pagination.limit)}
                  className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl text-xs font-black transition-all ${
                    pagination.page === i + 1 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'bg-white border border-outline-variant text-outline hover:text-primary'
                  }`}
                >
                  {i + 1}
                </button>
              )).slice(Math.max(0, pagination.page - 3), Math.min(pagination.totalPages, pagination.page + 2))}
            </div>
            <button 
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchData(pagination.page + 1, pagination.limit)}
              className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl border border-outline-variant bg-white text-outline hover:text-primary transition-all shadow-sm ${pagination.page >= pagination.totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                <header>
                  <h3 className="text-2xl font-black text-on-surface">Add New Elite Lead</h3>
                  <p className="text-sm font-medium text-outline mt-1">Populate lead information to begin the conversion process.</p>
                </header>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline">First Name</label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. Julianne" />
                  </div>
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline">Last Name</label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. Smith" />
                  </div>
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline">Email Address</label>
                    <input value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="name@company.com" />
                  </div>
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline">Phone Number</label>
                    <input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="+1 (555) 000-0000" />
                  </div>
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline">Initial Notes</label>
                    <input value={newNotes} onChange={e => setNewNotes(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. Interested in Penthouse" />
                  </div>
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline">Budget (₹)</label>
                    <input type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. 500000" />
                  </div>
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline">Lead Source</label>
                    <select value={newSource} onChange={e => setNewSource(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all appearance-none">
                      <option value="Web Admin">Web Admin</option>
                      <option value="Referral">Referral</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Cold Call">Cold Call</option>
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline">Interested Property</label>
                    <input value={newInterestedProperty} onChange={e => setNewInterestedProperty(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. 742 Evergreen Terrace" />
                  </div>
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline">Pre-Approval Status</label>
                    <input value={newPreapprovalStatus} onChange={e => setNewPreapprovalStatus(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. Verified ₹10 Cr" />
                  </div>
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline">Expected Close Date</label>
                    <input type="date" value={newExpectedCloseDate} onChange={e => setNewExpectedCloseDate(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline">Lead Location</label>
                    <input value={newLocation} onChange={e => setNewLocation(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. Los Angeles, CA" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-outline hover:text-on-surface transition-all">Cancel</button>
                  <button onClick={handleCreateLead} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Create Lead</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

