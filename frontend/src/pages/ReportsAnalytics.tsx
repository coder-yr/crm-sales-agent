import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCRMStore } from '../store/crmStore';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' as const },
});

const fmt = (v: number) => v >= 10000000 ? `₹${(v / 10000000).toFixed(2)} Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(2)} L` : `₹${(v / 1000).toFixed(0)} K`;

export const ReportsAnalytics: React.FC = () => {
  const { leads, pipelineStages, getConversionRate } = useCRMStore();

  // Computed KPIs
  const closedStage = pipelineStages.find(s => s.name.toLowerCase().includes('closed'));
  const newStage = pipelineStages.find(s => s.name.toLowerCase().includes('new'));
  
  const totalRevenue = leads
    .filter(l => l.stageId === closedStage?.id)
    .reduce((s, l) => s + (Number(l.budget) || 0), 0);
    
  const closedDeals = leads.filter(l => l.stageId === closedStage?.id).length;
  const newLeads = leads.filter(l => l.stageId === newStage?.id).length;
  const conversionRate = getConversionRate();

  const kpis = [
    { label: 'Total Revenue', value: fmt(totalRevenue), icon: 'payments', color: '#4F46E5', bg: '#eef2ff' },
    { label: 'Closed Deals', value: closedDeals.toString(), icon: 'handshake', color: '#059669', bg: '#ecfdf5' },
    { label: 'New Leads', value: newLeads.toString(), icon: 'group_add', color: '#d97706', bg: '#fffbeb' },
    { label: 'Conversion Rate', value: `${conversionRate.toFixed(1)}%`, icon: 'speed', color: '#7c3aed', bg: '#f5f3ff' },
  ];

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

  // Conversion Funnel Computation
  const funnel = useMemo(() => {
    const totalLeads = leads.length || 1;
    return pipelineStages.map((stage, i) => {
      const stageCount = leads.filter(l => l.stageId === stage.id).length;
      // Show actual distribution across pipeline stages instead of simulating yield
      const distributionPct = Math.round((stageCount / totalLeads) * 100);
      
      const bgs = ['#eef2ff', '#f5f3ff', '#fcf8ff', '#fcf8ff', '#ecfdf5'];
      return {
        label: stage.name,
        val: stageCount.toString(),
        yield: `${distributionPct}%`,
        color: stage.color,
        bg: bgs[i % bgs.length]
      };
    });
  }, [leads, pipelineStages]);
  
  // Revenue Forecast Computation
  const revenueForecast = useMemo(() => {
    const now = new Date();
    const data = [];
    
    // Total 10 bars (7 historical, 3 forecast)
    for (let i = -6; i <= 3; i++) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const isHistorical = i <= 0;
      
      let value = 0;
      if (isHistorical) {
        value = leads
          .filter(l => {
            const d = new Date(l.updatedAt);
            return d.getMonth() === targetMonth.getMonth() && 
                   d.getFullYear() === targetMonth.getFullYear() &&
                   l.stageId === closedStage?.id;
          })
          .reduce((sum, l) => sum + (Number(l.budget) || 0), 0);
      } else {
        value = leads
          .filter(l => {
            if (!l.expectedCloseDate) return false;
            const d = new Date(l.expectedCloseDate);
            return d.getMonth() === targetMonth.getMonth() && 
                   d.getFullYear() === targetMonth.getFullYear();
          })
          .reduce((sum, l) => sum + (Number(l.budget) || 0), 0);
      }
      
      data.push({
        label: targetMonth.toLocaleString('default', { month: 'short', year: 'numeric' }),
        value,
        isHistorical
      });
    }

    const maxValue = Math.max(...data.map(d => d.value), 100000);
    return data.map(d => ({
      ...d,
      height: valueToHeight(d.value, maxValue),
      displayValue: fmt(d.value)
    }));

    function valueToHeight(val: number, max: number) {
      if (val === 0) return '8%'; // Minimal height for empty months
      return `${Math.max(12, (val / max) * 100)}%`;
    }
  }, [leads, closedStage]);

  const forecastLabels = useMemo(() => {
    if (revenueForecast.length === 0) return { start: '', mid: '', end: '' };
    return {
      start: revenueForecast[0].label,
      mid: revenueForecast[Math.floor(revenueForecast.length / 2)].label,
      end: `${revenueForecast[revenueForecast.length - 1].label} (Forecast)`
    };
  }, [revenueForecast]);

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-end justify-between">
        <div>
          <h1 className="text-[30px] font-semibold leading-tight" style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Comprehensive performance metrics derived from CRM SSOT
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <span className="material-symbols-outlined">calendar_today</span>
            This Quarter
          </button>
          <button className="btn-primary">
            <span className="material-symbols-outlined">download</span>
            Export Report
          </button>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div {...fadeUp(0.05)} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="card p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>
                <span className="material-symbols-outlined text-[20px]" style={{ color: kpi.color, fontVariationSettings: "'FILL' 1" }}>
                  {kpi.icon}
                </span>
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--outline)' }}>
              {kpi.label}
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--on-surface)' }}>{kpi.value}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-12 gap-6">
        {/* Revenue Forecast */}
        <motion.div {...fadeUp(0.1)} className="col-span-12 lg:col-span-8 card p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>Revenue Forecast</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>Projected income vs. historical performance</p>
            </div>
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--surface-container)' }}>
              {['Weekly', 'Monthly'].map((t, i) => (
                <button
                  key={t}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${i === 1 ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-64 relative flex items-end gap-2">
            <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="border-t border-gray-100 w-full h-0"></div>
              ))}
            </div>
            {revenueForecast.map((bar, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: bar.height }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                className={`flex-1 rounded-t-lg relative group transition-all ${
                  bar.isHistorical 
                    ? 'bg-primary' 
                    : 'bg-primary-container border-2 border-dashed border-primary/30'
                }`}
                style={{ opacity: bar.isHistorical ? 1 : 0.6 }}
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl">
                  {bar.label}: {bar.displayValue}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-6 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--outline)' }}>
            <span>{forecastLabels.start}</span>
            <span>{forecastLabels.mid}</span>
            <span>{forecastLabels.end}</span>
          </div>
        </motion.div>

        {/* Lead Sources */}
        <motion.div {...fadeUp(0.12)} className="col-span-12 lg:col-span-4 card p-8">
          <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>Lead Sources</h3>
          <p className="text-xs mb-8" style={{ color: 'var(--on-surface-variant)' }}>Performance per channel</p>
          
          <div className="flex justify-center mb-10">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <span className="material-symbols-outlined text-[80px]" style={{ color: 'var(--surface-container-high)' }}>pie_chart</span>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold bg-white/80 backdrop-blur-sm rounded-lg px-2 mt-4" style={{ color: 'var(--on-surface)' }}>{leads.length}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider bg-white/80 backdrop-blur-sm rounded-lg px-2" style={{ color: 'var(--outline)' }}>Total</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {sources.map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>{s.label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>{s.pct}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Conversion Funnel */}
      <motion.div {...fadeUp(0.14)} className="card p-8">
        <div className="mb-10">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>Sales Conversion Funnel</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>End-to-end performance tracking from acquisition to close</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {funnel.map((s, i) => (
            <div key={s.label} className="flex flex-col">
              <div className="flex-1 rounded-2xl p-6 text-center transition-all hover:translate-y-[-2px]" style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
                <p className="text-xl font-bold mb-1" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--outline)' }}>{s.label}</p>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'white' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: s.yield }}
                    transition={{ duration: 1, delay: 0.4 + i * 0.1 }}
                    className="h-full"
                    style={{ background: s.color }}
                  />
                </div>
                <p className="mt-2 text-[10px] font-bold" style={{ color: i === 4 ? '#059669' : 'var(--outline)' }}>{s.yield} Dist.</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

