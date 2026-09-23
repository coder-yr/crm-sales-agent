import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCRMStore } from '../store/crmStore';
import { useTasksStore } from '../store/tasksStore';
import { tasksService } from '../services/tasks.service';
import { leadsService } from '../services/leads.service';
import { activitiesService } from '../services/activities.service';
import { pipelineService } from '../services/pipeline.service';
import type { Activity } from '../services/activities.service';
import type { PipelineStage } from '../types';
import { CompanyResearchCard } from '../components/CompanyResearchCard';
import { CompanySignalsCard } from '../components/CompanySignalsCard';
import { DealIntelligenceCard } from '../components/DealIntelligenceCard';
import { NextBestActionCard } from '../components/NextBestActionCard';
import { OutreachDraftCard } from '../components/OutreachDraftCard';

export const LeadDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showStageModal, setShowStageModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [lead, setLead] = useState<any>(null);
  const [availableStages, setAvailableStages] = useState<PipelineStage[]>([]);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState('');

  const { leads, updateLead } = useCRMStore();
  const { tasks, setTasks, addTask, updateTask } = useTasksStore();

  useEffect(() => {
    // Try to find in store first
    const existingLead = leads.find(l => l.id === id);
    if (existingLead) {
      setLead(existingLead);
    } else if (id) {
      // Fetch if not in store
      leadsService.getLeadById(id).then(res => {
        if (res.success) setLead(res.data);
      });
    }
  }, [id, leads]);

  const leadTasks = lead ? tasks.filter(t => t.leadId === lead.id) : [];

  useEffect(() => {
    if (!lead?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [tasksRes, activitiesRes, stagesRes] = await Promise.all([
          tasksService.getTasks(),
          activitiesService.getLeadActivities(lead.id),
          pipelineService.getStages()
        ]);
        
        if (tasksRes.success) setTasks(tasksRes.data);
        if (activitiesRes.success) setActivities(activitiesRes.data);
        if (stagesRes.success) setAvailableStages(stagesRes.data);
      } catch (error) {
        console.error('Failed to fetch lead data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [lead?.id, setTasks]);

  const handleStageChange = async (newStageId: string) => {
    try {
      const response = await leadsService.updateLeadStage(lead.id, newStageId);
      if (response.success) {
        updateLead(lead.id, { stageId: newStageId });
        setLead({ ...lead, stageId: newStageId }); // Local update
        setShowStageModal(false);
      }
    } catch (error) {
      console.error('Failed to update stage', error);
    }
  };

  const handleBudgetUpdate = async () => {
    const budgetValue = parseFloat(tempBudget.replace(/[^0-9.]/g, ''));
    if (isNaN(budgetValue)) return;

    try {
      const response = await leadsService.updateLead(lead.id, { budget: budgetValue });
      if (response.success) {
        updateLead(lead.id, { budget: budgetValue });
        setLead({ ...lead, budget: budgetValue });
        setIsEditingBudget(false);
      }
    } catch (error) {
      console.error('Failed to update budget', error);
    }
  };

  const handleAddTask = async () => {
    try {
      const response = await tasksService.createTask({
        title: 'New Follow-up',
        leadId: lead.id,
        description: 'Automatic follow-up task',
        dueDate: new Date().toISOString(),
      });
      if (response.success) {
        addTask(response.data);
      }
    } catch (error) {
      console.error('Failed to add task', error);
    }
  };

  const tabs = ['Overview', 'Activities', 'Tasks', 'Documents'];

  if (loading && !lead) {
    return <div className="p-20 text-center font-bold text-outline">Loading Lead Intelligence...</div>;
  }

  if (!lead) {
    return <div className="p-20 text-center font-bold text-outline">Lead Not Found</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' as any }}
      className="p-8 max-w-7xl mx-auto w-full"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Lead Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="relative">
            <img className="w-24 h-24 rounded-3xl object-cover shadow-xl border-4 border-white" src={`https://i.pravatar.cc/200?u=${lead.id}`} alt={`${lead.firstName} ${lead.lastName}`} />
            <div className="absolute -bottom-2 -right-2 bg-secondary-container text-secondary px-2.5 py-1 rounded-xl text-[10px] font-black border border-secondary/10 uppercase tracking-widest shadow-lg">Verified</div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-black text-on-surface tracking-tight">{lead.firstName} {lead.lastName}</h2>
              <span className="bg-primary-container text-primary text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest">Buyer</span>
            </div>
            <div className="flex items-center gap-4 text-outline font-medium text-sm">
              <span className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors" onClick={() => { setIsEditingBudget(true); setTempBudget(lead.budget?.toString() || '0'); }}>
                <span className="material-symbols-outlined text-sm text-primary">payments</span> 
                {isEditingBudget ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      className="w-24 bg-surface-container border border-primary rounded px-2 py-0.5 text-xs font-bold outline-none" 
                      value={tempBudget}
                      onChange={(e) => setTempBudget(e.target.value)}
                      onBlur={handleBudgetUpdate}
                      onKeyDown={(e) => e.key === 'Enter' && handleBudgetUpdate()}
                      autoFocus
                    />
                  </div>
                ) : (
                  <>Budget: ₹{Number(lead.budget || 0).toLocaleString('en-IN')}</>
                )}
              </span>
              <span className="w-1.5 h-1.5 bg-outline-variant rounded-full"></span>
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-primary">location_on</span> {lead.location || 'Location Not Set'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary py-2.5 px-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">history_edu</span> Log Activity
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowStageModal(!showStageModal)}
              className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {availableStages.find(s => s.id === lead.stageId)?.name || 'Active'} <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            <AnimatePresence>
              {showStageModal && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-outline-variant shadow-2xl z-50 p-2"
                >
                  {availableStages.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleStageChange(s.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${lead.stageId === s.id ? 'bg-primary-container text-primary' : 'hover:bg-surface-container'}`}
                    >
                      {s.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-8">
        {/* Main Activity/Details Column */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Tabs */}
          <div className="card overflow-hidden">
            <div className="flex border-b border-outline-variant px-6 bg-surface-container-low">
              {tabs.map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-black text-xs uppercase tracking-widest transition-all relative ${
                    activeTab === tab ? 'text-primary' : 'text-outline hover:text-on-surface'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              ))}
            </div>
            {/* Tab Content */}
            <div className="p-8">
              {activeTab === 'Overview' && (
                <div className="space-y-10">
                  <div className="grid grid-cols-2 gap-y-10 gap-x-12">
                    {[
                      { label: 'Lead Source', val: lead.source || 'Direct', icon: 'language' },
                      { label: 'Interested Property', val: lead.interestedProperty || 'Not Specified', icon: 'home_work', link: true },
                      { label: 'Pre-Approval Status', val: lead.preapprovalStatus || 'Pending Verification', icon: 'verified', status: true },
                      { label: 'Expected Close Date', val: lead.expectedCloseDate ? new Date(lead.expectedCloseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not Scheduled', icon: 'calendar_today' },
                    ].map(item => (
                      <div key={item.label} className="space-y-2">
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">{item.label}</p>
                        <p className={`text-sm font-bold flex items-center gap-2 ${item.link ? 'text-primary hover:underline cursor-pointer' : 'text-on-surface'}`}>
                          {item.status ? (
                            <span className="inline-flex items-center gap-1.5 bg-secondary-container text-secondary px-2.5 py-0.5 rounded-lg border border-secondary/10">
                               <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> {item.val}
                            </span>
                          ) : (
                            <><span className="material-symbols-outlined text-primary/40 text-lg">{item.icon}</span> {item.val}</>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-8 border-t border-outline-variant">
                    <h3 className="text-sm font-black text-on-surface uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">notes</span> Internal Notes
                    </h3>
                    <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant border-dashed">
                      <p className="text-sm text-on-surface-variant font-medium leading-relaxed italic">
                        {lead.notes || '"Lead is looking for a home with at least 4 bedrooms and a dedicated home office. Ready to move as soon as the right property hits the market."'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'Tasks' && (
                <div className="space-y-4">
                   {loading ? (
                      <div className="py-12 text-center text-outline">Loading tasks...</div>
                   ) : leadTasks.length === 0 ? (
                      <div className="py-12 text-center text-outline">No tasks for this lead.</div>
                   ) : (
                     leadTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-outline-variant">
                           <button 
                            onClick={() => updateTask(task.id, { isCompleted: !task.isCompleted })}
                            className={`w-5 h-5 rounded-full border-2 ${task.isCompleted ? 'bg-primary border-primary' : 'border-outline-variant'}`}
                           >
                              {task.isCompleted && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                           </button>
                           <span className={`text-sm font-bold ${task.isCompleted ? 'text-outline line-through' : 'text-on-surface'}`}>{task.title}</span>
                           <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-outline">{new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                     ))
                   )}
                   <button onClick={handleAddTask} className="w-full py-3 border-2 border-dashed border-outline-variant rounded-2xl text-xs font-black uppercase tracking-widest text-outline hover:text-primary hover:border-primary transition-all">
                      + Add New Follow-up
                   </button>
                </div>
              )}
              {activeTab !== 'Overview' && activeTab !== 'Tasks' && (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-outline-variant">upcoming</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface">No {activeTab.toLowerCase()} found</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Company Intelligence & Research Agent */}
          <CompanyResearchCard
            leadId={lead.id}
            leadName={`${lead.firstName} ${lead.lastName}`}
            leadEmail={lead.email}
          />

          {/* AI Signal Detection Agent */}
          <CompanySignalsCard
            leadId={lead.id}
            companyId={lead.companyId}
            companyName={lead.company?.name || lead.companyName}
            hasResearch={true}
          />

          {/* AI Deal Intelligence Agent (Phase 6) */}
          <DealIntelligenceCard
            leadId={lead.id}
            leadName={`${lead.firstName} ${lead.lastName}`}
            companyName={lead.company?.name || lead.companyName}
          />

          {/* AI Next Best Action Recommendations Agent (Phase 7) */}
          <NextBestActionCard
            leadId={lead.id}
            leadName={`${lead.firstName} ${lead.lastName}`}
            companyName={lead.company?.name || lead.companyName}
            onTaskCreated={() => {
              if (lead?.id) {
                tasksService.getTasks({ leadId: lead.id }).then((res) => {
                  if (res?.data) {
                    useTasksStore.getState().setTasks(res.data);
                  }
                }).catch(() => {});
              }
            }}
          />

          {/* AI Outreach Draft Agent (Phase 8) */}
          <OutreachDraftCard
            leadId={lead.id}
            leadName={`${lead.firstName} ${lead.lastName}`}
            companyName={lead.company?.name || lead.companyName}
          />

          {/* Timeline/Activity Preview */}
          <div className="card p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Recent Activity Feed</h3>
              <button className="text-primary text-xs font-black uppercase tracking-widest hover:opacity-80">Full History</button>
            </div>
            <div className="space-y-10 relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-surface-container-highest"></div>
              {activities.length > 0 ? (
                activities.slice(0, 5).map((act) => {
                  const typeMap: any = {
                    LEAD_CREATED: { title: 'Lead Created', icon: 'person_add', color: 'bg-emerald-500' },
                    LEAD_ASSIGNED: { title: 'Lead Assigned', icon: 'assignment_ind', color: 'bg-blue-500' },
                    STAGE_CHANGED: { title: 'Stage Updated', icon: 'sync_alt', color: 'bg-amber-500' },
                    LEAD_UPDATED: { title: 'Details Updated', icon: 'edit', color: 'bg-indigo-500' },
                    LEAD_DELETED: { title: 'Lead Deleted', icon: 'delete', color: 'bg-rose-500' },
                  };
                  const typeInfo = typeMap[act.type] || { title: act.type, icon: 'history', color: 'bg-primary' };

                  return (
                    <div key={act.id} className="relative flex gap-6 pl-12">
                      <div className={`absolute left-2 top-1.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[14px] shadow-sm ${typeInfo.color}`}>
                        <span className="material-symbols-outlined text-xs">{typeInfo.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{typeInfo.title}</p>
                        <p className="text-xs text-on-surface-variant font-medium mt-1 leading-relaxed">
                          {act.user.firstName} {act.user.lastName} performed this action
                        </p>
                        <p className="text-[10px] text-outline mt-2 uppercase tracking-widest font-black">
                          {new Date(act.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-outline text-sm font-bold italic">No activity recorded yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* Contact Quick Info */}
          <div className="card p-8">
            <h4 className="text-[10px] font-black text-outline uppercase tracking-widest mb-6">Contact Channels</h4>
            <div className="space-y-6">
              {[
                { label: 'Email Address', val: lead.email, icon: 'mail' },
                { label: 'Phone Number', val: lead.phone || '+1 (310) 555-0198', icon: 'call' },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-outline group-hover:bg-primary-container group-hover:text-primary transition-all">
                    <span className="material-symbols-outlined text-[22px]">{c.icon}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-outline uppercase tracking-tight">{c.label}</p>
                    <p className="text-sm font-bold text-on-surface mt-0.5 group-hover:text-primary transition-colors">{c.val}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Score Bento */}
          <div className="bg-primary rounded-3xl p-8 text-white shadow-2xl shadow-primary/30 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Lead Engagement</h4>
                <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-md">
                   <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-5xl font-black">94</span>
                <span className="text-indigo-200 text-sm font-bold">/ 100</span>
              </div>
              <div className="mt-6 w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: "94%" }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-secondary-fixed shadow-[0_0_15px_rgba(111,251,190,0.5)]"></motion.div>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
          </div>

          {/* Upcoming Tasks Side Widget */}
          <div className="card p-8">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black text-outline uppercase tracking-widest">Scheduled Tasks</h4>
              <button onClick={handleAddTask} className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center hover:bg-primary-container hover:text-primary transition-all">
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
            <div className="space-y-4">
              {leadTasks.slice(0, 3).map(task => (
                <div key={task.id} className={`flex items-start gap-4 p-4 rounded-2xl border ${task.isCompleted ? 'bg-surface-container-low opacity-60' : 'bg-orange-50/50 border-orange-100'}`}>
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-orange-600 shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">{task.isCompleted ? 'check' : 'event_repeat'}</span>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${task.isCompleted ? 'line-through text-outline' : 'text-on-surface'}`}>{task.title}</p>
                    <p className={`text-[11px] font-bold mt-1 uppercase tracking-tight ${task.isCompleted ? 'text-outline' : 'text-orange-600'}`}>
                      {task.isCompleted ? 'Completed' : `Due: ${new Date(task.dueDate).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

