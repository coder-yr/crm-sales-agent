import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCRMStore } from '../store/crmStore';
import { useUsersStore } from '../store/usersStore';
import { leadsService } from '../services/leads.service';
import { pipelineService } from '../services/pipeline.service';
import { usersService } from '../services/users.service';
import confetti from 'canvas-confetti';

const fmt = (v: number) => v >= 10000000 ? `₹${(v / 10000000).toFixed(2)} Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(2)} L` : `₹${(v / 1000).toFixed(0)} K`;

export const Pipeline: React.FC = () => {
  const { pipelineStages, setPipelineStages, leads, setLeads, moveLeadStage, addLead } = useCRMStore();
  const { users, setUsers } = useUsersStore();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', budget: '', notes: '', agentId: '' });

  React.useEffect(() => {
    const fetchData = async () => {
      const [stagesRes, leadsRes, usersRes] = await Promise.all([
        pipelineService.getStages(),
        leadsService.getLeads(),
        usersService.getUsers()
      ]);
      if (stagesRes.success) setPipelineStages(stagesRes.data);
      if (leadsRes.success) setLeads(leadsRes.data);
      if (usersRes.success) setUsers(usersRes.data);
    };
    fetchData();
  }, [setPipelineStages, setLeads, setUsers]);

  const getDeals = (stageId: string) => leads.filter(d => d.stageId === stageId);
  const getTotal = (stageId: string) => leads.filter(d => d.stageId === stageId).reduce((s, d) => s + (Number(d.budget) || 0), 0);
  const totalActive = leads.filter(d => {
    const stage = pipelineStages.find(s => s.id === d.stageId);
    return !stage?.name.toLowerCase().includes('closed');
  }).reduce((s, d) => s + (Number(d.budget) || 0), 0);

  const handleDrop = (stageId: string) => {
    if (draggingId) {
       moveLeadStage(draggingId, stageId);
       // Call API
       leadsService.updateLead(draggingId, { stageId });

       // Confetti for Closed Won
       const targetStage = pipelineStages.find(s => s.id === stageId);
       if (targetStage?.name.toLowerCase().includes('closed won')) {
         confetti({
           particleCount: 150,
           spread: 70,
           origin: { y: 0.6 },
           colors: ['#4F46E5', '#10B981', '#F59E0B']
         });
       }
    }
    setDraggingId(null);
    setDragOverCol(null);
  };

  const handleAddDeal = async () => {
    if (!form.firstName || !form.lastName) return;
    
    const response = await leadsService.createLead({
      firstName: form.firstName,
      lastName: form.lastName,
      budget: parseFloat(form.budget) || 0,
      notes: form.notes,
      stageId: pipelineStages[0]?.id || '1',
      source: 'Pipeline Admin',
      assigneeId: form.agentId || undefined
    });

    if (response.success) {
      addLead(response.data);
      setForm({ firstName: '', lastName: '', budget: '', notes: '', agentId: '' });
      setShowModal(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' as any }}
      className="p-8 flex flex-col"
      style={{ fontFamily: 'Inter, sans-serif', height: 'calc(100vh - 4rem)' }}
    >
      {/* Header */}
      <div className="flex items-end justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-[30px] font-semibold" style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
            Sales Pipeline
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>
            Active pipeline: {fmt(totalActive)} · {leads.filter(d => d.status !== 'Closed').length} live deals
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'white', border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)' }}
          >
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filters
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'white', border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)' }}
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            Q4 2024
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'var(--primary)', boxShadow: '0 4px 14px rgba(79,70,229,0.25)' }}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Deal
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-5 flex-1 overflow-x-auto overflow-y-hidden pb-4">
        {pipelineStages.map(col => {
          const colDeals = getDeals(col.id);
          const colTotal = getTotal(col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              className="w-[280px] shrink-0 flex flex-col gap-3"
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
              onDrop={() => handleDrop(col.id)}
              onDragLeave={() => setDragOverCol(null)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>{col.name}</span>
                  <span className={`chip`} style={{ fontSize: '10px', padding: '1px 6px', background: `${col.color}20`, color: col.color }}>{colDeals.length}</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: 'var(--outline)' }}>{fmt(colTotal)}</span>
              </div>

              {/* Cards drop zone */}
              <div
                className="flex flex-col gap-3 flex-1 min-h-[80px] rounded-xl p-2 transition-all"
                style={{
                  background: isOver ? 'var(--primary-container)' : 'transparent',
                  border: isOver ? '2px dashed var(--primary)' : '2px dashed transparent',
                }}
              >
                <AnimatePresence>
                  {colDeals.map(deal => (
                    <motion.div
                      key={deal.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      draggable
                      onDragStart={() => setDraggingId(deal.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                      className="rounded-xl p-4 cursor-grab active:cursor-grabbing group transition-all"
                      style={{
                        background: draggingId === deal.id ? 'var(--surface-container)' : 'white',
                        border: '1px solid var(--outline-variant)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        opacity: draggingId === deal.id ? 0.5 : 1,
                      }}
                      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>{deal.firstName} {deal.lastName}</h4>
                        <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity cursor-move" style={{ color: 'var(--outline)' }}>drag_indicator</span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: 'var(--on-surface-variant)' }}>{deal.email}</p>
                      <p className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>{fmt(Number(deal.budget) || 0)}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <img className="w-6 h-6 rounded-full object-cover ring-2 ring-white" src={`https://i.pravatar.cc/100?u=${deal.assigneeId || 'unassigned'}`} alt="" />
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--outline)' }}>
                            {users.find(u => u.id === deal.assigneeId)?.firstName || 'Unassigned'}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-surface-container-highest text-outline uppercase tracking-widest">
                          {deal.source || 'Direct'}
                        </span>
                      </div>

                      <div className="flex gap-1 mt-3 pt-3" style={{ borderTop: '1px solid var(--outline-variant)' }}>
                        {[{ icon: 'call', label: 'Call' }, { icon: 'mail', label: 'Email' }].map(a => (
                          <button key={a.icon} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                            style={{ color: 'var(--on-surface-variant)' }}
                          >
                            <span className="material-symbols-outlined text-[14px]">{a.icon}</span>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Empty drop zone */}
                {colDeals.length === 0 && !isOver && (
                  <div className="flex-1 flex items-center justify-center py-8 rounded-xl text-center"
                    style={{ border: '2px dashed var(--outline-variant)', color: 'var(--outline)' }}>
                    <div>
                      <span className="material-symbols-outlined text-2xl block mb-1">add</span>
                      <span className="text-xs font-medium">Add Card</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <motion.button
        onClick={() => setShowModal(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-2xl flex items-center justify-center text-white z-40"
        style={{ background: 'var(--primary)', boxShadow: '0 8px 24px rgba(79,70,229,0.35)' }}
      >
        <span className="material-symbols-outlined text-[24px]">person_add</span>
      </motion.button>

      {/* Add Deal Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 w-full max-w-md"
              style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.12)' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--on-surface)' }}>Add New Deal</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--on-surface-variant)' }}>Creates in the New Inquiry stage.</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--outline)' }}>First Name</label>
                    <input
                      placeholder="e.g. Julianne"
                      value={form.firstName}
                      onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                      style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', fontFamily: 'Inter' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--outline)' }}>Last Name</label>
                    <input
                      placeholder="e.g. Smith"
                      value={form.lastName}
                      onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                      style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', fontFamily: 'Inter' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--outline)' }}>Budget (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500000"
                      value={form.budget}
                      onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                      style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', fontFamily: 'Inter' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--outline)' }}>Notes</label>
                    <input
                      placeholder="e.g. High Interest"
                      value={form.notes}
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                      style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', fontFamily: 'Inter' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--outline)' }}>Assign Agent</label>
                  <select
                    value={form.agentId}
                    onChange={e => setForm(p => ({ ...p, agentId: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', fontFamily: 'Inter' }}
                  >
                    <option value="">Select Agent</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)' }}>
                  Cancel
                </button>
                <button onClick={handleAddDeal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--primary)', boxShadow: '0 4px 14px rgba(79,70,229,0.25)' }}>
                  Create Deal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

