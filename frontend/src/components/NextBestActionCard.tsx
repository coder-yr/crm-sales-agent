import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { recommendationsService } from '../services/recommendations.service';
import type { RecommendationRecord } from '../services/recommendations.service';
import { agentRunsService } from '../services/agentRuns.service';
import { socketService } from '../services/socket.service';

interface NextBestActionCardProps {
  leadId: string;
  leadName?: string;
  companyName?: string;
  onTaskCreated?: () => void;
}

const PRIORITY_THEME: Record<
  string,
  { label: string; badge: string; border: string; glow: string; icon: string }
> = {
  HIGH: {
    label: 'High Priority',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25',
    border: 'border-rose-500/30 hover:border-rose-500/50',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.08)]',
    icon: 'bolt',
  },
  MEDIUM: {
    label: 'Medium Priority',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25',
    border: 'border-amber-500/30 hover:border-amber-500/50',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.08)]',
    icon: 'schedule',
  },
  LOW: {
    label: 'Low Priority',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25',
    border: 'border-sky-500/30 hover:border-sky-500/50',
    glow: 'shadow-[0_0_20px_rgba(14,165,233,0.08)]',
    icon: 'info',
  },
};

export const NextBestActionCard: React.FC<NextBestActionCardProps> = ({
  leadId,
  leadName,
  companyName,
  onTaskCreated,
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'pending' | 'history'>('pending');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await recommendationsService.getLeadRecommendations(leadId);
      if (res && res.data) {
        setRecommendations(res.data);
      }

      // Check latest agent run status
      const runRes = await agentRunsService.getLatestRun('Lead', leadId, 'recommendations');
      if (runRes && runRes.data) {
        if (runRes.data.status === 'RUNNING' || runRes.data.status === 'QUEUED') {
          setIsTriggering(true);
          setProgress(runRes.data.status === 'QUEUED' ? 25 : 65);
          setStage(runRes.data.status === 'QUEUED' ? 'Queued in recommendation pipeline...' : 'Evaluating next best actions...');
        }
      }
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        console.error('Failed to load recommendations:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Socket.IO realtime listener
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleAgentQueued = (data: any) => {
      if (data.entityId === leadId && data.agentType === 'recommendations') {
        setIsTriggering(true);
        setProgress(15);
        setStage('Queued for action recommendation...');
        setNotification(null);
      }
    };

    const handleAgentStarted = (data: any) => {
      if (data.entityId === leadId && data.agentType === 'recommendations') {
        setIsTriggering(true);
        setProgress(35);
        setStage('Evaluating 6 deterministic rules...');
      }
    };

    const handleAgentProgress = (data: any) => {
      if (data.entityId === leadId && data.agentType === 'recommendations') {
        setIsTriggering(true);
        setProgress(data.progress || 60);
        setStage(data.stage || 'Synthesizing recommendations...');
      }
    };

    const handleAgentCompleted = (data: any) => {
      if (data.entityId === leadId && data.agentType === 'recommendations') {
        setIsTriggering(false);
        setProgress(100);
        setStage('Complete');
        fetchRecommendations();
      }
    };

    const handleAgentFailed = (data: any) => {
      if (data.entityId === leadId && data.agentType === 'recommendations') {
        setIsTriggering(false);
        setNotification({
          type: 'error',
          message: data.error || 'Failed to generate recommendations',
        });
      }
    };

    socket.on('ai.agent.queued', handleAgentQueued);
    socket.on('ai.agent.started', handleAgentStarted);
    socket.on('ai.agent.progress', handleAgentProgress);
    socket.on('ai.agent.completed', handleAgentCompleted);
    socket.on('ai.agent.failed', handleAgentFailed);

    return () => {
      socket.off('ai.agent.queued', handleAgentQueued);
      socket.off('ai.agent.started', handleAgentStarted);
      socket.off('ai.agent.progress', handleAgentProgress);
      socket.off('ai.agent.completed', handleAgentCompleted);
      socket.off('ai.agent.failed', handleAgentFailed);
    };
  }, [leadId, fetchRecommendations]);

  const handleTriggerRecommendations = async () => {
    if (isTriggering) return;
    setIsTriggering(true);
    setProgress(10);
    setStage('Triggering Next Best Action agent...');
    setNotification(null);

    try {
      await recommendationsService.startRecommendations(leadId);
      setProgress(30);
      setStage('Worker dispatched...');
    } catch (err: any) {
      setIsTriggering(false);
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to trigger recommendations',
      });
    }
  };

  const handleAccept = async (id: string, createTask: boolean) => {
    setActionInProgress(id);
    setNotification(null);
    try {
      const res = await recommendationsService.acceptRecommendation(id, createTask);
      setNotification({
        type: 'success',
        message: createTask
          ? `Recommendation accepted and CRM Task created: "${res.data.task?.title || 'Action Task'}"`
          : 'Recommendation accepted successfully.',
      });
      await fetchRecommendations();
      if (createTask && onTaskCreated) {
        onTaskCreated();
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to accept recommendation',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setActionInProgress(id);
    setNotification(null);
    try {
      await recommendationsService.dismissRecommendation(id);
      setNotification({
        type: 'success',
        message: 'Recommendation dismissed.',
      });
      await fetchRecommendations();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to dismiss recommendation',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Filter recommendations
  const pendingRecs = recommendations.filter((r) => r.status === 'PENDING');
  const historyRecs = recommendations.filter((r) => r.status !== 'PENDING');

  const primaryRec = pendingRecs[0] || null;
  const secondaryRecs = pendingRecs.slice(1);

  return (
    <div className="card p-8 relative overflow-hidden bg-surface-container-low/50 backdrop-blur-sm border border-outline-variant/30 shadow-xl rounded-3xl transition-all">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
            <span className="material-symbols-outlined text-2xl">auto_awesome</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-on-surface tracking-tight">
                AI Next Best Action
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Phase 7
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Deterministic recommendations {companyName ? `for ${companyName}` : leadName ? `for ${leadName}` : ''} based on signals, deal health & activity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Tab Filter */}
          <div className="flex p-1 bg-surface-container-highest/60 rounded-xl border border-outline-variant/30">
            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                filterTab === 'pending'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Active ({pendingRecs.length})
            </button>
            <button
              onClick={() => setFilterTab('history')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                filterTab === 'history'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              History ({historyRecs.length})
            </button>
          </div>

          {/* Trigger Button */}
          <button
            onClick={handleTriggerRecommendations}
            disabled={isTriggering}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/40 hover:border-primary/40 transition-all disabled:opacity-50"
            title="Re-run deterministic rules"
          >
            <span
              className={`material-symbols-outlined text-sm ${
                isTriggering ? 'animate-spin text-amber-500' : 'text-on-surface-variant'
              }`}
            >
              {isTriggering ? 'sync' : 'refresh'}
            </span>
            {isTriggering ? 'Evaluating...' : 'Re-evaluate'}
          </button>
        </div>
      </div>

      {/* Progress Bar when running */}
      <AnimatePresence>
        {isTriggering && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  {stage || 'Evaluating Next Best Actions...'}
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`mb-5 p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">
                {notification.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {loading && !recommendations.length ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-3xl animate-spin text-primary">
            progress_activity
          </span>
          <span className="text-xs font-medium">Loading recommendation intelligence...</span>
        </div>
      ) : filterTab === 'pending' ? (
        /* ACTIVE RECOMMENDATIONS VIEW */
        <div>
          {primaryRec ? (
            <div className="space-y-4">
              {/* PRIMARY RECOMMENDATION BANNER */}
              {(() => {
                const theme = PRIORITY_THEME[primaryRec.priority] || PRIORITY_THEME.MEDIUM;
                const isExpanded = expandedEvidenceId === primaryRec.id;
                const isWorking = actionInProgress === primaryRec.id;

                return (
                  <div
                    className={`relative p-6 rounded-2xl border bg-gradient-to-br from-amber-500/5 via-primary/5 to-surface-container-low transition-all ${theme.border} ${theme.glow}`}
                  >
                    {/* Top Row: Primary Badge & Priority */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-sm">
                          <span className="material-symbols-outlined text-[14px]">star</span>
                          Primary Next Action
                        </span>
                        <span
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${theme.badge}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">{theme.icon}</span>
                          {theme.label}
                        </span>
                      </div>

                      {primaryRec.ruleKey && (
                        <span className="font-mono text-[11px] text-on-surface-variant bg-surface-container px-2.5 py-0.5 rounded-md border border-outline-variant/30">
                          {primaryRec.ruleKey}
                        </span>
                      )}
                    </div>

                    {/* Action Headline */}
                    <div className="mb-2">
                      <h4 className="text-lg font-black text-on-surface tracking-tight leading-snug">
                        {primaryRec.action}
                      </h4>
                      {primaryRec.title && primaryRec.title !== primaryRec.action && (
                        <p className="text-xs font-bold text-on-surface-variant mt-0.5">
                          {primaryRec.title}
                        </p>
                      )}
                    </div>

                    {/* Reason statement */}
                    {primaryRec.reason && (
                      <p className="text-xs text-on-surface-variant leading-relaxed mb-5">
                        {primaryRec.reason}
                      </p>
                    )}

                    {/* Action Buttons Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-outline-variant/20">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleAccept(primaryRec.id, true)}
                          disabled={isWorking}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {isWorking ? 'hourglass_top' : 'add_task'}
                          </span>
                          Accept & Create Task
                        </button>

                        <button
                          onClick={() => handleAccept(primaryRec.id, false)}
                          disabled={isWorking}
                          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/40 transition-all disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">check</span>
                          Accept Only
                        </button>

                        <button
                          onClick={() => handleDismiss(primaryRec.id)}
                          disabled={isWorking}
                          className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                          Dismiss
                        </button>
                      </div>

                      {/* Expand evidence toggle */}
                      <button
                        onClick={() =>
                          setExpandedEvidenceId(isExpanded ? null : primaryRec.id)
                        }
                        className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                        {isExpanded ? 'Hide audit evidence' : 'Why this action?'}
                      </button>
                    </div>

                    {/* Expandable Evidence Drawer */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-outline-variant/20 overflow-hidden"
                        >
                          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-2.5">
                            <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-bold">
                              <span className="flex items-center gap-1.5 text-on-surface">
                                <span className="material-symbols-outlined text-sm text-amber-500">
                                  fact_check
                                </span>
                                Deterministic Rule Trigger Criteria
                              </span>
                              <span>Version: {primaryRec.version || 'v1'}</span>
                            </div>

                            {primaryRec.evidence?.evidence &&
                            primaryRec.evidence.evidence.length > 0 ? (
                              <ul className="space-y-1.5 text-xs text-on-surface">
                                {primaryRec.evidence.evidence.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-xs text-amber-500 mt-0.5">
                                      check_small
                                    </span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-on-surface-variant italic">
                                Criteria met for deterministic rule: {primaryRec.ruleKey}
                              </p>
                            )}

                            {primaryRec.evidence?.evaluatedAt && (
                              <div className="text-[10px] text-on-surface-variant pt-1">
                                Evaluated at: {new Date(primaryRec.evidence.evaluatedAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

              {/* SECONDARY RECOMMENDATIONS LIST (if any) */}
              {secondaryRecs.length > 0 && (
                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs">list_alt</span>
                      Alternative Recommendations ({secondaryRecs.length})
                    </h5>
                  </div>

                  <div className="space-y-3">
                    {secondaryRecs.map((rec) => {
                      const theme = PRIORITY_THEME[rec.priority] || PRIORITY_THEME.MEDIUM;
                      const isExpanded = expandedEvidenceId === rec.id;
                      const isWorking = actionInProgress === rec.id;

                      return (
                        <div
                          key={rec.id}
                          className="p-5 rounded-2xl border border-outline-variant/30 bg-surface-container-low/60 hover:bg-surface-container transition-all"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${theme.badge}`}
                                >
                                  {theme.label}
                                </span>
                                {rec.ruleKey && (
                                  <span className="font-mono text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant/20">
                                    {rec.ruleKey}
                                  </span>
                                )}
                              </div>
                              <h5 className="text-sm font-bold text-on-surface">
                                {rec.action}
                              </h5>
                              {rec.reason && (
                                <p className="text-xs text-on-surface-variant">{rec.reason}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleAccept(rec.id, true)}
                                disabled={isWorking}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-white transition-all disabled:opacity-50"
                              >
                                Accept & Task
                              </button>
                              <button
                                onClick={() => handleDismiss(rec.id)}
                                disabled={isWorking}
                                className="p-2 rounded-xl text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-50"
                                title="Dismiss"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
                              </button>
                            </div>
                          </div>

                          {/* Evidence drawer toggle */}
                          <div className="pt-2">
                            <button
                              onClick={() =>
                                setExpandedEvidenceId(isExpanded ? null : rec.id)
                              }
                              className="text-[11px] font-semibold text-primary hover:text-primary-hover flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-xs">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                              {isExpanded ? 'Hide evidence' : 'Show evidence'}
                            </button>

                            <AnimatePresence>
                              {isExpanded && rec.evidence?.evidence && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-2.5 p-3.5 bg-surface-container rounded-xl border border-outline-variant/30"
                                >
                                  <ul className="space-y-1.5 text-xs text-on-surface">
                                    {rec.evidence.evidence.map((item, idx) => (
                                      <li key={idx} className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-xs text-amber-500">
                                          check
                                        </span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* EMPTY PENDING STATE */
            <div className="py-12 px-6 text-center rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-lowest/50">
              <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl">done_all</span>
              </div>
              <h4 className="text-base font-black text-on-surface mb-1">
                No Pending Next Best Actions
              </h4>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto mb-5 leading-relaxed">
                All recommendations have been acted upon or dismissed, or current signals/deal stage
                do not warrant an immediate triggered action.
              </p>
              <button
                onClick={handleTriggerRecommendations}
                disabled={isTriggering}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isTriggering ? 'Evaluating Rules...' : 'Run Recommendations Agent'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* HISTORY TAB (ACCEPTED / REJECTED / COMPLETED) */
        <div className="space-y-3">
          {historyRecs.length > 0 ? (
            historyRecs.map((rec) => {
              const isAccepted = rec.status === 'ACCEPTED' || rec.status === 'COMPLETED';
              return (
                <div
                  key={rec.id}
                  className="p-5 rounded-2xl border border-outline-variant/30 bg-surface-container-low space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isAccepted
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                            : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/30'
                        }`}
                      >
                        {rec.status}
                      </span>
                      <span className="text-xs font-bold text-on-surface">{rec.action}</span>
                    </div>

                    <span className="text-[10px] text-on-surface-variant">
                      {new Date(rec.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {rec.task && (
                    <div className="p-3 bg-surface-container rounded-xl border border-outline-variant/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-on-surface font-medium">
                        <span className="material-symbols-outlined text-sm text-primary">
                          task_alt
                        </span>
                        <span>Task: {rec.task.title}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-surface-container-highest text-on-surface-variant">
                        {rec.task.status || 'Active'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-xs text-on-surface-variant font-medium">
              No historical recommendation activity recorded yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
