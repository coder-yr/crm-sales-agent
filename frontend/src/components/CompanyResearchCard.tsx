import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { agentRunsService } from '../services/agentRuns.service';
import type { AgentRunRecord, CompanyResearchResult } from '../services/agentRuns.service';
import { socketService } from '../services/socket.service';

interface CompanyResearchCardProps {
  leadId: string;
  leadName: string;
  leadEmail?: string | null;
}

export const CompanyResearchCard: React.FC<CompanyResearchCardProps> = ({
  leadId,
  leadName,
}) => {
  const [latestRun, setLatestRun] = useState<AgentRunRecord | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch latest research run on mount or lead change
  const fetchLatestRun = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await agentRunsService.getLatestRun('Lead', leadId, 'research');
      if (res && res.data) {
        setLatestRun(res.data);
        setCurrentRunId(res.data.id);
        if (res.data.status === 'FAILED') {
          setIsStarting(false);
          setProgress(0);
          setStage('');
          setErrorMsg(res.data.error || 'Previous research run failed');
        } else if (res.data.status === 'COMPLETED') {
          setIsStarting(false);
          setProgress(100);
          setStage('Completed');
          setErrorMsg(null);
        } else if (res.data.status === 'RUNNING' || res.data.status === 'QUEUED') {
          setProgress(res.data.status === 'QUEUED' ? 20 : 60);
          setStage(res.data.status === 'QUEUED' ? 'Queued for research...' : 'Researching company...');
        }
      } else {
        setLatestRun(null);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch latest agent run', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLatestRun();
  }, [fetchLatestRun]);

  // Socket.IO real-time event listener
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const isRelevantEvent = (data: { agentType?: string; runId?: string; agentRunId?: string; entityType?: string; entityId?: string }) => {
      if (data.agentType && data.agentType !== 'research') return false;
      const incomingRunId = data.runId || data.agentRunId;
      if (incomingRunId && currentRunId && incomingRunId === currentRunId) return true;
      if (data.entityId && data.entityId === leadId) return true;
      return false;
    };

    const handleQueued = (data: { entityId?: string; runId?: string; agentRunId?: string; stage?: string }) => {
      if (!isRelevantEvent(data)) return;
      if (data.runId || data.agentRunId) {
        setCurrentRunId(data.runId || data.agentRunId || null);
      }
      setProgress(15);
      setStage(data.stage || 'Queued for research...');
      setErrorMsg(null);
    };

    const handleStarted = (data: { entityId?: string; runId?: string; agentRunId?: string }) => {
      if (!isRelevantEvent(data)) return;
      setProgress(25);
      setStage('Research started...');
      setErrorMsg(null);
    };

    const handleProgress = (data: { entityId?: string; runId?: string; agentRunId?: string; progress?: number; stage?: string }) => {
      if (!isRelevantEvent(data)) return;
      setProgress(data.progress || 50);
      setStage(data.stage || 'Analyzing company data...');
      setErrorMsg(null);
    };

    const handleCompleted = (data: { entityId?: string; runId?: string; agentRunId?: string }) => {
      if (!isRelevantEvent(data)) return;
      setProgress(100);
      setStage('Completed');
      setIsStarting(false);
      setErrorMsg(null);
      fetchLatestRun();
    };

    const handleFailed = (data: { entityId?: string; runId?: string; agentRunId?: string; error?: string }) => {
      if (!isRelevantEvent(data)) return;
      setIsStarting(false);
      setProgress(0);
      setStage('');
      setErrorMsg(data.error || 'Company research failed');
      setLatestRun((prev) => (prev ? { ...prev, status: 'FAILED', error: data.error } : null));
      fetchLatestRun();
    };

    socket.on('ai.agent.queued', handleQueued);
    socket.on('ai.agent.started', handleStarted);
    socket.on('ai.agent.progress', handleProgress);
    socket.on('ai.agent.completed', handleCompleted);
    socket.on('ai.agent.failed', handleFailed);

    return () => {
      socket.off('ai.agent.queued', handleQueued);
      socket.off('ai.agent.started', handleStarted);
      socket.off('ai.agent.progress', handleProgress);
      socket.off('ai.agent.completed', handleCompleted);
      socket.off('ai.agent.failed', handleFailed);
    };
  }, [leadId, currentRunId, fetchLatestRun]);

  const handleStartResearch = async () => {
    setIsStarting(true);
    setErrorMsg(null);
    setProgress(15);
    setStage('Submitting research task...');

    try {
      const res = await agentRunsService.startResearch('Lead', leadId);
      if (res && res.success) {
        if (res.data?.agentRunId) {
          setCurrentRunId(res.data.agentRunId);
        }
        setStage(res.data.reused ? 'Re-attaching to active research...' : 'Queued for research...');
        setTimeout(() => fetchLatestRun(), 1500);
      }
    } catch (err: unknown) {
      setIsStarting(false);
      setProgress(0);
      setStage('');
      const msg = err instanceof Error ? err.message : 'Failed to start research';
      setErrorMsg(msg);
    }
  };

  const researchResult: CompanyResearchResult | null = latestRun?.output || null;
  const isRunning =
    (isStarting || latestRun?.status === 'QUEUED' || latestRun?.status === 'RUNNING') &&
    latestRun?.status !== 'FAILED' &&
    latestRun?.status !== 'COMPLETED';

  // Polling fallback while running to guarantee completion updates
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      fetchLatestRun();
    }, 2000);

    return () => clearInterval(interval);
  }, [isRunning, fetchLatestRun]);

  return (
    <div className="card p-6 bg-white border border-outline-variant shadow-sm rounded-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary shadow-sm">
            <span className="material-symbols-outlined text-xl">travel_explore</span>
          </div>
          <div>
            <h3 className="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
              Company Intelligence
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                Research Agent
              </span>
            </h3>
            <p className="text-xs text-outline font-medium mt-0.5">
              Source-backed company analysis & market signals
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={handleStartResearch}
            disabled={isRunning || loading}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all ${
              isRunning
                ? 'bg-surface-container text-outline cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90 hover:scale-[1.02] active:scale-95'
            }`}
          >
            <span className={`material-symbols-outlined text-base ${isRunning ? 'animate-spin' : ''}`}>
              {isRunning ? 'progress_activity' : 'psychology'}
            </span>
            {isRunning ? 'Researching...' : latestRun ? 'Re-run Research' : 'Research Company'}
          </button>
        </div>
      </div>

      {/* Progress Bar while running */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2"
          >
            <div className="flex items-center justify-between text-xs font-bold text-primary">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                {stage || 'Gathering company intelligence...'}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${Math.max(progress, 15)}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {errorMsg && !isRunning && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <span className="material-symbols-outlined text-rose-500 text-lg mt-0.5">error</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-rose-800">Research Failed</p>
            <p className="text-xs text-rose-600 mt-0.5 font-medium leading-relaxed">{errorMsg}</p>
          </div>
          <button
            onClick={handleStartResearch}
            className="text-xs font-bold text-rose-700 underline hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Completed Research Content */}
      {researchResult && !isRunning && (
        <div className="space-y-6 pt-2">
          {/* Company Core Card */}
          <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-base font-black text-on-surface">
                  {researchResult.company?.name || leadName || 'Company Profile'}
                </h4>
                {researchResult.company?.domain && (
                  <a
                    href={researchResult.company?.website || `https://${researchResult.company.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <span className="material-symbols-outlined text-xs">link</span>
                    {researchResult.company.domain}
                  </a>
                )}
              </div>
              {researchResult.company?.industry && (
                <span className="bg-secondary-container text-secondary text-[11px] font-bold px-3 py-1 rounded-xl border border-secondary/20 shadow-sm">
                  {researchResult.company.industry}
                </span>
              )}
            </div>

            <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
              {researchResult.businessSummary || researchResult.company?.description || 'No description available.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-outline pt-2 border-t border-outline-variant/60">
              {researchResult.company?.location && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                  {researchResult.company.location}
                </span>
              )}
              {researchResult.company?.foundedYear && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-primary">calendar_month</span>
                  Founded {researchResult.company.foundedYear}
                </span>
              )}
              {researchResult.researchedAt && (
                <span className="flex items-center gap-1 ml-auto text-[10px] text-outline/80">
                  <span className="material-symbols-outlined text-xs">schedule</span>
                  Researched {new Date(researchResult.researchedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Products & Technologies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Products / Services */}
            <div className="p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl space-y-2">
              <p className="text-[10px] font-black text-outline uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary">inventory_2</span>
                Products & Offerings
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {researchResult.productsOrServices && researchResult.productsOrServices.length > 0 ? (
                  researchResult.productsOrServices.map((prod, idx) => (
                    <span
                      key={idx}
                      className="bg-surface-container text-on-surface text-[11px] font-bold px-2.5 py-1 rounded-lg border border-outline-variant/60"
                    >
                      {prod}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-outline italic">No explicit products detected</span>
                )}
              </div>
            </div>

            {/* Technologies */}
            <div className="p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl space-y-2">
              <p className="text-[10px] font-black text-outline uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-indigo-500">memory</span>
                Detected Technologies
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {researchResult.technologies && researchResult.technologies.length > 0 ? (
                  researchResult.technologies.map((tech, idx) => (
                    <span
                      key={idx}
                      className="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-indigo-100"
                    >
                      {tech}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-outline italic">No technologies detected</span>
                )}
              </div>
            </div>
          </div>

          {/* Business Signals */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-sm">bolt</span>
              Detected Business Signals ({researchResult.businessSignals?.length || 0})
            </h4>

            {researchResult.businessSignals && researchResult.businessSignals.length > 0 ? (
              <div className="space-y-2.5">
                {researchResult.businessSignals.map((sig, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-surface-container-lowest border border-outline-variant rounded-2xl space-y-1.5 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-on-surface flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        {sig.title}
                      </span>
                      <span className="bg-amber-50 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-200">
                        {sig.confidence > 1 ? `${Math.round(sig.confidence)}%` : `${Math.round(sig.confidence * 100)}%`} CONFIDENCE
                      </span>
                    </div>

                    {sig.description && (
                      <p className="text-xs text-on-surface-variant font-medium leading-relaxed pl-4">
                        {sig.description}
                      </p>
                    )}

                    {sig.evidence && (
                      <div className="pl-4 pt-1">
                        <p className="text-[11px] text-outline font-serif italic bg-surface-container-low p-2 rounded-xl border border-outline-variant/60">
                          {sig.evidence}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl text-center text-xs text-outline font-medium">
                No active signals detected from public pages.
              </div>
            )}
          </div>

          {/* Evidence Sources */}
          {researchResult.sources && researchResult.sources.length > 0 && (
            <div className="pt-2 border-t border-outline-variant">
              <p className="text-[10px] font-black text-outline uppercase tracking-wider mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">verified</span>
                Verified Sources
              </p>
              <div className="flex flex-wrap gap-2">
                {researchResult.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-container text-outline hover:text-primary text-[10px] font-bold rounded-lg border border-outline-variant hover:border-primary transition-all"
                  >
                    <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                    {src.title || src.url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State before research */}
      {!latestRun && !isRunning && !errorMsg && (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center mx-auto text-outline">
            <span className="material-symbols-outlined text-2xl">manage_search</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface">No company intelligence gathered yet</p>
            <p className="text-[11px] text-outline mt-0.5">
              Click &quot;Research Company&quot; to automatically analyze {leadName}&apos;s company, products, tech stack, and buying signals.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
