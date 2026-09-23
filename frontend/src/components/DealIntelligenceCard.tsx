import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { agentRunsService } from '../services/agentRuns.service';
import type { DealIntelligenceRecord } from '../services/agentRuns.service';
import { socketService } from '../services/socket.service';

interface DealIntelligenceCardProps {
  leadId: string;
  leadName?: string;
  companyName?: string;
}

const HEALTH_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  HOT: {
    label: 'HOT',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: 'local_fire_department',
  },
  HEALTHY: {
    label: 'HEALTHY',
    bg: 'bg-teal-500/15',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    icon: 'verified',
  },
  WARM: {
    label: 'WARM',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: 'wb_sunny',
  },
  AT_RISK: {
    label: 'AT RISK',
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    icon: 'warning',
  },
  COLD: {
    label: 'COLD',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    icon: 'ac_unit',
  },
};

const URGENCY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  HIGH: { label: 'High Urgency', bg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20', text: 'text-rose-400' },
  MEDIUM: { label: 'Medium Urgency', bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', text: 'text-amber-400' },
  LOW: { label: 'Low Urgency', bg: 'bg-slate-500/10 text-slate-400 border border-slate-500/20', text: 'text-slate-400' },
};

export const DealIntelligenceCard: React.FC<DealIntelligenceCardProps> = ({
  leadId,
  leadName,
  companyName,
}) => {
  const [dealIntelligence, setDealIntelligence] = useState<DealIntelligenceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'positives' | 'risks' | 'missing'>('all');

  const fetchDealData = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      // 1. Fetch persisted deal intelligence
      const res = await agentRunsService.getDealIntelligence(leadId);
      if (res && res.data) {
        setDealIntelligence(res.data);
      }

      // 2. Fetch latest agent run to check if one is currently in flight
      const runRes = await agentRunsService.getLatestRun('Lead', leadId, 'deal_analysis');
      if (runRes && runRes.data) {
        if (runRes.data.status === 'RUNNING' || runRes.data.status === 'QUEUED') {
          setIsTriggering(true);
          setProgress(runRes.data.status === 'QUEUED' ? 25 : 65);
          setStage(runRes.data.status === 'QUEUED' ? 'Queued in worker pipeline...' : 'Evaluating intent & risk factors...');
        } else if (runRes.data.status === 'FAILED') {
          setIsTriggering(false);
          setErrorMsg(runRes.data.error || 'Deal analysis failed');
        }
      }
    } catch (err: any) {
      // Do not crash UI on 404
      if (err?.response?.status !== 404) {
        console.error('Failed to load deal intelligence:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchDealData();
  }, [fetchDealData]);

  // Socket.IO realtime listener
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleAgentQueued = (data: any) => {
      if (data.entityId === leadId && data.agentType === 'deal_analysis') {
        setIsTriggering(true);
        setProgress(15);
        setStage('Queued for deal evaluation...');
        setErrorMsg(null);
      }
    };

    const handleAgentStarted = (data: any) => {
      if (data.entityId === leadId && data.agentType === 'deal_analysis') {
        setIsTriggering(true);
        setProgress(35);
        setStage('Synthesizing signals & activities...');
        setErrorMsg(null);
      }
    };

    const handleAgentProgress = (data: any) => {
      if (data.entityId === leadId && data.agentType === 'deal_analysis') {
        setIsTriggering(true);
        setProgress(data.progress || 60);
        setStage(data.stage || 'Evaluating deal metrics...');
      }
    };

    const handleAgentCompleted = (data: any) => {
      if (data.entityId === leadId && data.agentType === 'deal_analysis') {
        setIsTriggering(false);
        setProgress(100);
        setStage('Complete');
        fetchDealData();
      }
    };

    const handleAgentFailed = (data: any) => {
      if (data.entityId === leadId && data.agentType === 'deal_analysis') {
        setIsTriggering(false);
        setProgress(0);
        setStage('');
        setErrorMsg(data.error || 'Deal analysis encountered an issue');
      }
    };

    const handleScoreUpdated = (data: any) => {
      if (data.leadId === leadId) {
        fetchDealData();
      }
    };

    socket.on('ai.agent.queued', handleAgentQueued);
    socket.on('ai.agent.started', handleAgentStarted);
    socket.on('ai.agent.progress', handleAgentProgress);
    socket.on('ai.agent.completed', handleAgentCompleted);
    socket.on('ai.agent.failed', handleAgentFailed);
    socket.on('deal.score.updated', handleScoreUpdated);
    socket.on('deal.health.updated', handleScoreUpdated);

    return () => {
      socket.off('ai.agent.queued', handleAgentQueued);
      socket.off('ai.agent.started', handleAgentStarted);
      socket.off('ai.agent.progress', handleAgentProgress);
      socket.off('ai.agent.completed', handleAgentCompleted);
      socket.off('ai.agent.failed', handleAgentFailed);
      socket.off('deal.score.updated', handleScoreUpdated);
      socket.off('deal.health.updated', handleScoreUpdated);
    };
  }, [leadId, fetchDealData]);

  const handleRunAnalysis = async () => {
    setIsTriggering(true);
    setProgress(10);
    setStage('Submitting deal analysis...');
    setErrorMsg(null);

    try {
      const res = await agentRunsService.startDealAnalysis(leadId);
      if (res && res.data) {
        setProgress(25);
        setStage('Queued in worker pipeline...');
      }
    } catch (err: any) {
      console.error('Trigger deal analysis failed:', err);
      setIsTriggering(false);
      setProgress(0);
      setStage('');
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to start deal analysis');
    }
  };

  const health = HEALTH_CONFIG[dealIntelligence?.dealHealth || 'COLD'] || HEALTH_CONFIG.COLD;
  const urgency = URGENCY_CONFIG[dealIntelligence?.urgency || 'MEDIUM'] || URGENCY_CONFIG.MEDIUM;

  const rawFactors: any = dealIntelligence?.factors || {};
  const positives = (rawFactors.positives || rawFactors.positiveFactors || []).map((p: any) => ({
    title: p.title || p.factor || 'Positive Factor',
    detail: p.detail || (p.metric ? `Metric: ${p.metric}` : undefined),
    evidence: p.evidence,
    confidence: p.confidence,
  }));
  const risks = (rawFactors.risks || rawFactors.riskFactors || []).map((r: any) => ({
    title: r.title || r.factor || 'Risk Factor',
    detail: r.detail || r.evidence || 'Identified risk pattern',
    severity: r.severity || 'MEDIUM',
  }));
  const missingData = (rawFactors.missingData || rawFactors.missingInformation || []).map((m: any) => ({
    title: m.title || m.factor || 'Missing Data',
    detail: m.detail || m.evidence || 'Information not yet provided',
    category: m.category || 'GENERAL',
  }));


  return (
    <div className="card p-8 relative overflow-hidden bg-surface-container-low/50 backdrop-blur-sm border border-outline-variant/30 shadow-xl rounded-3xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <span className="material-symbols-outlined text-2xl">psychology</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-on-surface tracking-tight">
                Deal Intelligence
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1 Engine
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Deterministic deal scoring {companyName ? `for ${companyName}` : leadName ? `for ${leadName}` : ''}, buying stage & risk analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAnalysis}
            disabled={isTriggering || loading}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              isTriggering
                ? 'bg-primary/20 text-primary cursor-not-allowed border border-primary/30'
                : 'bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <span
              className={`material-symbols-outlined text-base ${
                isTriggering ? 'animate-spin' : ''
              }`}
            >
              {isTriggering ? 'refresh' : 'insights'}
            </span>
            {isTriggering ? 'Analyzing Deal...' : dealIntelligence ? 'Re-Analyze Deal' : 'Analyze Deal'}
          </button>
        </div>
      </div>

      {/* Progress / Status Bar during run */}
      <AnimatePresence>
        {isTriggering && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20"
          >
            <div className="flex justify-between items-center text-xs font-bold text-indigo-300 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <span>{stage || 'Calculating multi-factor scores...'}</span>
              </div>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-indigo-950/40 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-rose-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {!dealIntelligence && !isTriggering && (
        <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container/20">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
            <span className="material-symbols-outlined text-3xl">query_stats</span>
          </div>
          <h4 className="text-sm font-bold text-on-surface">No Deal Intelligence Calculated Yet</h4>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto mt-1 mb-6 leading-relaxed">
            Run Deal Intelligence to evaluate Intent signals, Company & Contact fit, Engagement activities, and verifiable risks.
          </p>
          <button
            onClick={handleRunAnalysis}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:bg-primary-hover shadow-lg shadow-primary/25 transition-all"
          >
            Run Deal Intelligence
          </button>
        </div>
      )}

      {dealIntelligence && (
        <div className="space-y-6">
          {/* Top Hero Bento: Main Score + Badges */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Main Score Hero (5 cols) */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-surface-container to-surface-container-high border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-outline">
                    Comprehensive Deal Score
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl font-black text-on-surface tracking-tight" data-testid="deal-score-value">
                      {dealIntelligence.dealScore}
                    </span>
                    <span className="text-sm font-black text-outline">/ 100</span>
                  </div>
                </div>

                <div
                  className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${health.bg} ${health.text} ${health.border}`}
                  data-testid="deal-health-badge"
                >
                  <span className="material-symbols-outlined text-sm">{health.icon}</span>
                  <span className="text-xs font-black uppercase tracking-wider">{health.label}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-outline">Stage:</span>
                  <span className="px-2 py-0.5 rounded-md font-bold bg-surface-container-highest text-on-surface text-[11px]">
                    {dealIntelligence.buyingStage}
                  </span>
                </div>
                <div className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${urgency.bg}`}>
                  {urgency.label}
                </div>
                <div className="text-[11px] font-semibold text-outline">
                  {dealIntelligence.dataCompleteness}% Data Completeness
                </div>
              </div>
            </div>

            {/* Formula Subscores Breakdown (7 cols) */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-surface-container/60 border border-outline-variant/20 flex flex-col justify-between space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-outline">
                  Deterministic Score Breakdown
                </span>
                <span className="text-[10px] font-mono font-bold text-outline">
                  Formula: 40% Intent + 25% CoFit + 15% ContFit + 10% Eng + 10%(100-Risk)
                </span>
              </div>

              {/* 5 Sub-metric Bars */}
              <div className="space-y-2.5">
                {/* Intent (40%) */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-on-surface flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      Intent Score (40%)
                    </span>
                    <span className="font-mono font-bold text-on-surface">
                      {dealIntelligence.intentScore} / 100
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      data-testid="intent-bar"
                      className="h-full bg-blue-500 rounded-full transition-all duration-700"
                      style={{ width: `${dealIntelligence.intentScore}%` }}
                    />
                  </div>
                </div>

                {/* Company Fit (25%) */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-on-surface flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      Company Fit (25%)
                    </span>
                    <span className="font-mono font-bold text-on-surface">
                      {dealIntelligence.companyFitScore} / 100
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      data-testid="company-fit-bar"
                      className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                      style={{ width: `${dealIntelligence.companyFitScore}%` }}
                    />
                  </div>
                </div>

                {/* Contact Fit (15%) */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-on-surface flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      Contact Fit (15%)
                    </span>
                    <span className="font-mono font-bold text-on-surface">
                      {dealIntelligence.contactFitScore} / 100
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      data-testid="contact-fit-bar"
                      className="h-full bg-purple-500 rounded-full transition-all duration-700"
                      style={{ width: `${dealIntelligence.contactFitScore}%` }}
                    />
                  </div>
                </div>

                {/* Engagement (10%) */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-on-surface flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Engagement (10%)
                    </span>
                    <span className="font-mono font-bold text-on-surface">
                      {dealIntelligence.engagementScore} / 100
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      data-testid="engagement-bar"
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${dealIntelligence.engagementScore}%` }}
                    />
                  </div>
                </div>

                {/* Risk Score (10% as 100 - Risk) */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-on-surface flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      Deal Risk (Impact: -{Math.round(dealIntelligence.riskScore * 0.1)} pts)
                    </span>
                    <span className="font-mono font-bold text-rose-400">
                      {dealIntelligence.riskScore} / 100
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      data-testid="risk-bar"
                      className="h-full bg-rose-500 rounded-full transition-all duration-700"
                      style={{ width: `${dealIntelligence.riskScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Why This Score? */}
          <div className="mt-8 pt-6 border-t border-outline-variant/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-outline">
                  Why This Score?
                </h4>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                  Evidence-backed explanation distinguishing positive factors from confirmed risks and incomplete data.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-outline-variant/30 text-[11px] font-bold">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    activeTab === 'all' ? 'bg-primary text-white' : 'text-outline hover:text-on-surface'
                  }`}
                >
                  All ({positives.length + risks.length + missingData.length})
                </button>
                <button
                  onClick={() => setActiveTab('positives')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    activeTab === 'positives' ? 'bg-emerald-500 text-white' : 'text-outline hover:text-on-surface'
                  }`}
                >
                  ↑ Positives ({positives.length})
                </button>
                <button
                  onClick={() => setActiveTab('risks')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    activeTab === 'risks' ? 'bg-rose-500 text-white' : 'text-outline hover:text-on-surface'
                  }`}
                >
                  ⚠ Risks ({risks.length})
                </button>
                <button
                  onClick={() => setActiveTab('missing')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    activeTab === 'missing' ? 'bg-blue-500 text-white' : 'text-outline hover:text-on-surface'
                  }`}
                >
                  ℹ Missing ({missingData.length})
                </button>
              </div>
            </div>

            {/* 3 Columns / Cards of Factors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Positives */}
              {(activeTab === 'all' || activeTab === 'positives') && (
                <div className={`p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 ${activeTab !== 'all' ? 'md:col-span-3' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-emerald-400 text-base">trending_up</span>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      Positive Factors
                    </span>
                    <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400">
                      {positives.length}
                    </span>
                  </div>

                  {positives.length === 0 ? (
                    <p className="text-xs text-outline italic py-2">No verified positive factors found</p>
                  ) : (
                    <div className="space-y-3">
                      {positives.map((pos, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-surface-container/70 border border-outline-variant/20 text-xs">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-on-surface">{pos.title}</span>
                            {pos.confidence !== undefined && (
                              <span className="text-[10px] font-black text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10">
                                {pos.confidence}% conf
                              </span>
                            )}
                          </div>
                          {pos.detail && (
                            <p className="text-on-surface-variant text-[11px] leading-relaxed mb-1.5">
                              {pos.detail}
                            </p>
                          )}
                          {pos.evidence && (
                            <div className="p-2 rounded-lg bg-surface-container-highest/60 text-[11px] font-mono text-outline italic border-l-2 border-emerald-500">
                              "{pos.evidence}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Verifiable Deal Risks */}
              {(activeTab === 'all' || activeTab === 'risks') && (
                <div className={`p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 ${activeTab !== 'all' ? 'md:col-span-3' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-rose-400 text-base">warning</span>
                    <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                      Verifiable Deal Risks
                    </span>
                    <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400">
                      {risks.length}
                    </span>
                  </div>

                  {risks.length === 0 ? (
                    <div className="text-xs text-outline italic py-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
                      <span>No active deal risks identified</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {risks.map((risk, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-surface-container/70 border border-outline-variant/20 text-xs">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-on-surface">{risk.title}</span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                risk.severity === 'HIGH'
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {risk.severity}
                            </span>
                          </div>
                          <p className="text-on-surface-variant text-[11px] leading-relaxed">
                            {risk.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Missing Data / Limited Confidence */}
              {(activeTab === 'all' || activeTab === 'missing') && (
                <div className={`p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 ${activeTab !== 'all' ? 'md:col-span-3' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-blue-400 text-base">info</span>
                    <span className="text-xs font-black uppercase tracking-wider text-blue-400">
                      Missing Information
                    </span>
                    <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400">
                      {missingData.length}
                    </span>
                  </div>

                  {missingData.length === 0 ? (
                    <p className="text-xs text-outline italic py-2">Profile is fully populated</p>
                  ) : (
                    <div className="space-y-3">
                      {missingData.map((m, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-surface-container/70 border border-outline-variant/20 text-xs">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-on-surface">{m.title}</span>
                            <span className="text-[9px] font-mono text-outline uppercase tracking-wider">
                              {m.category}
                            </span>
                          </div>
                          <p className="text-on-surface-variant text-[11px] leading-relaxed">
                            {m.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="pt-4 border-t border-outline-variant/15 flex flex-wrap items-center justify-between text-[10px] text-outline font-semibold">
            <div>
              Scored via algorithm: <span className="font-mono text-on-surface">{dealIntelligence.modelVersion}</span>
            </div>
            <div>
              Last analyzed: {new Date(dealIntelligence.lastAnalyzedAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
