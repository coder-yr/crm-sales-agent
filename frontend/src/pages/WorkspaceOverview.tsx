import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useCRMStore } from '../store/crmStore';
import { useUsersStore } from '../store/usersStore';
import { useTasksStore } from '../store/tasksStore';
import { leadsService } from '../services/leads.service';
import { pipelineService } from '../services/pipeline.service';
import { usersService } from '../services/users.service';
import { tasksService } from '../services/tasks.service';
import { activitiesService } from '../services/activities.service';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' as const },
});

const fmt = (v: number) => v >= 10000000 ? `₹${(v / 10000000).toFixed(2)} Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(2)} L` : `₹${(v / 1000).toFixed(0)} K`;

export const WorkspaceOverview: React.FC = () => {
  const { leads, setLeads, pipelineStages, setPipelineStages, getPipelineValue, getConversionRate } = useCRMStore();
  const { users, setUsers } = useUsersStore();
  const { setTasks } = useTasksStore();

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [leadsRes, stagesRes, usersRes, tasksRes, actsRes] = await Promise.all([
          leadsService.getLeads(),
          pipelineService.getStages(),
          usersService.getUsers(),
          tasksService.getTasks(),
          activitiesService.getActivities()
        ]);
        if (leadsRes.success) setLeads(leadsRes.data);
        if (stagesRes.success) setPipelineStages(stagesRes.data);
        if (usersRes.success) setUsers(usersRes.data);
        if (tasksRes.success) setTasks(tasksRes.data);
        if (actsRes.success) setActivities(actsRes.data);
      } catch (error) {
        console.error('Failed to sync workspace data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [setLeads, setPipelineStages, setUsers, setTasks]);

  const getTimeAgo = (date: Date) => {
    const diff = new Date().getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Computed KPIs
  const totalLeads = leads.length;
  const pipelineValue = getPipelineValue();
  const conversionRate = getConversionRate();
  
  const closedStage = pipelineStages.find(s => s.name.toLowerCase().includes('closed'));
  const totalRevenue = leads
    .filter(l => l.stageId === closedStage?.id)
    .reduce((s, l) => s + (Number(l.budget) || 0), 0);
    
  const activeDeals = leads.filter(l => l.stageId !== closedStage?.id).length;

  const kpis: Array<{ label: string, value: string, sub?: string, icon: string, color: string, bg: string, change?: string, up?: boolean }> = [
    { label: 'Total Leads', value: totalLeads.toString(), icon: 'group', color: '#4F46E5', bg: '#eef2ff' },
    { label: 'Active Pipeline Value', value: fmt(pipelineValue), sub: `Across ${activeDeals} pending contracts`, icon: 'payments', color: '#059669', bg: '#ecfdf5' },
    { label: 'Conversion Rate', value: `${conversionRate.toFixed(1)}%`, icon: 'speed', color: '#d97706', bg: '#fffbeb' },
    { label: 'Total Revenue (YTD)', value: fmt(totalRevenue), icon: 'trending_up', color: '#7c3aed', bg: '#f5f3ff' },
  ];

  // Computed Pipeline Data
  const pipelineData = useMemo(() => {
    return pipelineStages.map(stage => {
      const stageLeads = leads.filter(l => l.stageId === stage.id);
      const val = stageLeads.reduce((sum, l) => sum + (Number(l.budget) || 0), 0);
      const pct = pipelineValue > 0 ? (val / pipelineValue) * 100 : 0;
      return { label: stage.name, count: stageLeads.length, value: fmt(val), pct, color: stage.color };
    });
  }, [leads, pipelineStages, pipelineValue]);

  // Computed Team Performance
  const teamPerformance = useMemo(() => {
    const closedStage = pipelineStages.find(s => s.name.toLowerCase().includes('closed'));
    return users.map(u => {
      const userLeads = leads.filter(l => l.assigneeId === u.id);
      const closed = userLeads.filter(l => l.stageId === closedStage?.id);
      const rev = closed.reduce((s, l) => s + (Number(l.budget) || 0), 0);
      return {
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        deals: closed.length,
        revenue: fmt(rev),
        revValue: rev,
        img: `https://i.pravatar.cc/100?u=${u.id}`
      };
    }).sort((a, b) => b.revValue - a.revValue).slice(0, 4);
  }, [users, leads, pipelineStages]);

  // Computed Recent Activities
  const recentActivities = useMemo(() => {
    return (activities || []).map(act => {
      let icon = 'notifications';
      let iconBg = '#f1f5f9';
      let iconColor = '#64748b';
      let title = act.type;
      
      switch(act.type) {
        case 'LEAD_CREATED':
          icon = 'person_add'; iconBg = '#eef2ff'; iconColor = '#4F46E5';
          title = `New lead created`;
          break;
        case 'STAGE_CHANGED':
          icon = 'sync'; iconBg = '#fff7ed'; iconColor = '#f97316';
          title = `Stage updated`;
          break;
        case 'TASK_COMPLETED':
          icon = 'task_alt'; iconBg = '#f0fdf4'; iconColor = '#22c55e';
          title = `Task completed`;
          break;
        case 'NOTE_ADDED':
          icon = 'description'; iconBg = '#eff6ff'; iconColor = '#3b82f6';
          title = `Note added`;
          break;
      }

      return {
        ...act,
        icon, iconBg, iconColor,
        title: `${title} by ${act.user?.firstName || 'System'}`,
        time: getTimeAgo(new Date(act.createdAt)),
        sub: act.metadata?.leadName ? `Lead: ${act.metadata.leadName}` : ''
      };
    }).slice(0, 5);
  }, [activities]);

  // Lead Sources Computation
  const sources = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { const s = l.source || 'Organic'; counts[s] = (counts[s] || 0) + 1; });
    const total = leads.length || 1;
    const colors = ['#4F46E5', '#10b981', '#f59e0b', '#ef4444'];
    return Object.entries(counts).map(([label, count], i) => ({
      label, count, pct: Math.round((count / total) * 100) + '%', color: colors[i % colors.length]
    }));
  }, [leads]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-outline animate-pulse uppercase tracking-widest">Aggregating Workspace Intelligence...</p>
      </div>
    );
  }

  if (leads.length === 0 && !loading) {
     return (
      <div className="p-8 max-w-[1400px] mx-auto text-center space-y-4">
        <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-[40px] text-outline">query_stats</span>
        </div>
        <h2 className="text-2xl font-bold text-on-surface">No Workspace Data Yet</h2>
        <p className="text-outline max-w-md mx-auto">Start by adding leads or creating pipeline stages to see your performance metrics here.</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-primary text-white rounded-xl font-bold">Refresh Workspace</button>
      </div>
     );
  }

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Page Header */}
      <motion.div {...fadeUp(0)}>
        <h1 className="text-[30px] font-semibold leading-tight" style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
          Workspace Overview
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Real-time performance metrics computed from global store data
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div {...fadeUp(0.05)} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map((kpi) => (
          <motion.div
            key={kpi.label}
            whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
            className="rounded-2xl p-6 cursor-default"
            style={{ background: 'white', border: '1px solid var(--outline-variant)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>
                <span className="material-symbols-outlined text-[20px]" style={{ color: kpi.color, fontVariationSettings: "'FILL' 1" }}>
                  {kpi.icon}
                </span>
              </div>
              {kpi.change && (
                <span
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: kpi.up ? '#059669' : '#ef4444' }}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {kpi.up ? 'trending_up' : 'trending_down'}
                  </span>
                  {kpi.change}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--outline)' }}>
              {kpi.label}
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--on-surface)' }}>{kpi.value}</p>
            {kpi.sub && <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>{kpi.sub}</p>}
          </motion.div>
        ))}
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Pipeline Distribution */}
        <motion.div {...fadeUp(0.1)} className="col-span-12 lg:col-span-5 rounded-2xl p-6"
          style={{ background: 'white', border: '1px solid var(--outline-variant)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>Pipeline Distribution</h3>
          <p className="text-xs mb-6" style={{ color: 'var(--on-surface-variant)' }}>Deal stages and values</p>
          <div className="space-y-4">
            {pipelineData.map((stage) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>{stage.label}</span>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--surface-container)', color: 'var(--outline)' }}>
                      {stage.count}
                    </span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>{stage.value}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-container-high)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stage.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: stage.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Lead Sources */}
        <motion.div {...fadeUp(0.12)} className="col-span-12 lg:col-span-3 rounded-2xl p-6"
          style={{ background: 'white', border: '1px solid var(--outline-variant)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>Leads by Source</h3>
          <p className="text-xs mb-6" style={{ color: 'var(--on-surface-variant)' }}>Channel performance</p>

          <div className="flex justify-center mb-6">
            <div className="relative w-36 h-36 flex items-center justify-center">
               <span className="material-symbols-outlined text-[64px]" style={{ color: 'var(--surface-container-high)' }}>pie_chart</span>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-bold bg-white/80 backdrop-blur-sm rounded-lg px-2" style={{ color: 'var(--on-surface)' }}>{totalLeads}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {sources.map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm" style={{ color: 'var(--on-surface)' }}>{s.label}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>{s.pct}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activities */}
        <motion.div {...fadeUp(0.14)} className="col-span-12 lg:col-span-4 rounded-2xl p-6"
          style={{ background: 'white', border: '1px solid var(--outline-variant)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold" style={{ color: 'var(--on-surface)' }}>Recent Activities</h3>
            <button className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>View all</button>
          </div>
          <p className="text-xs mb-6" style={{ color: 'var(--on-surface-variant)' }}>Live event feed</p>

          <div className="space-y-5">
            {recentActivities.map((act, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: act.iconBg }}>
                  <span className="material-symbols-outlined text-[16px]" style={{ color: act.iconColor, fontVariationSettings: "'FILL' 1" }}>
                    {act.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-snug" style={{ color: 'var(--on-surface)' }}>{act.title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--outline)' }}>
                    {act.time} · {act.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Team Performance */}
      <motion.div {...fadeUp(0.18)} className="rounded-2xl p-6"
        style={{ background: 'white', border: '1px solid var(--outline-variant)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--on-surface)' }}>Team Performance</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>Derived from closed deals assigned to users</p>
          </div>
          <button
            className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
          >
            View Report
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {teamPerformance.map((member, i) => (
            <motion.div
              key={member.name}
              whileHover={{ y: -2 }}
              className="rounded-xl p-4 cursor-default transition-all"
              style={{ background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <img src={member.img} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-white text-[9px] font-bold flex items-center justify-center"
                    style={{ color: 'var(--primary)', border: '1.5px solid var(--primary-container)' }}>
                    #{i + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--on-surface)' }}>{member.name}</p>
                  <p className="text-xs" style={{ color: 'var(--outline)' }}>{member.role}</p>
                </div>
              </div>
              <div className="flex justify-between text-xs mb-3">
                <span style={{ color: 'var(--on-surface-variant)' }}>{member.deals} deals</span>
                <span className="font-semibold" style={{ color: 'var(--primary)' }}>{member.revenue}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-container-high)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (member.revValue / (pipelineValue || 1)) * 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                  className="h-full rounded-full"
                  style={{ background: 'var(--primary)' }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

