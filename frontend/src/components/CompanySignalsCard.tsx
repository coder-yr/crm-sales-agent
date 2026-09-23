import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { agentRunsService } from '../services/agentRuns.service';
import type { AgentRunRecord, SignalItem } from '../services/agentRuns.service';
import { socketService } from '../services/socket.service';

interface CompanySignalsCardProps {
  companyId?: string;
  leadId?: string;
  companyName?: string;
  hasResearch?: boolean;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HIRING: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  EXPANSION: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  NEWS: { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/30' },
  LEADERSHIP_CHANGE: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  WEBSITE_CHANGE: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30' },
  PRODUCT_LAUNCH: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  PARTNERSHIP: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  FUNDING: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  GROWTH: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
  ENGAGEMENT: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
};

export const CompanySignalsCard: React.FC<CompanySignalsCardProps> = ({
  companyId,
  leadId,
  companyName,
  hasResearch = true,
}) => {
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [, setLatestRun] = useState<AgentRunRecord | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStrength, setSelectedStrength] = useState<string>('ALL');

  const fetchSignalsAndRun = useCallback(async () => {
    if (!companyId && !leadId) return;
    setLoading(true);
    try {
      // 1. Fetch latest agent run for signal detection
      const entityType = leadId ? 'Lead' : 'Company';
      const entityId = leadId || companyId!;
      const runRes = await agentRunsService.getLatestRun(entityType, entityId, 'signal_detection');

      if (runRes && runRes.data) {
        setLatestRun(runRes.data);
        setCurrentRunId(runRes.data.id);

        if (runRes.data.status === 'FAILED') {
          setIsTriggering(false);
          setProgress(0);
          setStage('');
          setErrorMsg(runRes.data.error || 'Signal detection failed');
        } else if (runRes.data.status === 'COMPLETED') {
          setIsTriggering(false);
          setProgress(100);
          setStage('Completed');
          setErrorMsg(null);
          if (runRes.data.output?.signals) {
            setSignals(runRes.data.output.signals);
          }
        } else if (runRes.data.status === 'RUNNING' || runRes.data.status === 'QUEUED') {
          setIsTriggering(true);
          setProgress(runRes.data.status === 'QUEUED' ? 20 : 60);
          setStage(runRes.data.status === 'QUEUED' ? 'Queued for detection...' : 'Detecting business signals...');
        }
      }

      // 2. If companyId is known, also fetch persisted company signals
      if (companyId) {
        const sigRes = await agentRunsService.getCompanySignals(companyId);
        if (sigRes && sigRes.data && sigRes.data.length > 0) {
          setSignals(sigRes.data);
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load company signals', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, leadId]);

  useEffect(() => {
    fetchSignalsAndRun();
  }, [fetchSignalsAndRun]);

  // Socket.IO Real-time Events
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const isTargetEvent = (data: { agentType?: string; runId?: string; agentRunId?: string; entityId?: string }) => {
      if (data.agentType && data.agentType !== 'signal_detection') return false;
      const incomingRunId = data.runId || data.agentRunId;
      if (incomingRunId && currentRunId && incomingRunId === currentRunId) return true;
      if (data.entityId && (data.entityId === leadId || data.entityId === companyId)) return true;
      return false;
    };

    const handleQueued = (data: any) => {
      if (!isTargetEvent(data)) return;
      if (data.runId || data.agentRunId) {
        setCurrentRunId(data.runId || data.agentRunId);
      }
      setIsTriggering(true);
      setProgress(20);
      setStage(data.stage || 'Queued for signal detection...');
      setErrorMsg(null);
    };

    const handleStarted = (data: any) => {
      if (!isTargetEvent(data)) return;
      setIsTriggering(true);
      setProgress(40);
      setStage('Extracting candidate signals...');
      setErrorMsg(null);
    };

    const handleProgress = (data: any) => {
      if (!isTargetEvent(data)) return;
      setIsTriggering(true);
      setProgress(data.progress || 50);
      setStage(data.stage || 'Validating evidence against research...');
      setErrorMsg(null);
    };

    const handleCompleted = (data: any) => {
      if (!isTargetEvent(data)) return;
      setIsTriggering(false);
      setProgress(100);
      setStage('Completed');
      setErrorMsg(null);
      if (data.output?.signals) {
        setSignals(data.output.signals);
      }
      fetchSignalsAndRun();
    };

    const handleFailed = (data: any) => {
      if (!isTargetEvent(data)) return;
      setIsTriggering(false);
      setProgress(0);
      setStage('');
      setErrorMsg(data.error || 'Signal detection failed');
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
  }, [currentRunId, leadId, companyId, fetchSignalsAndRun]);

  const handleStartDetection = async () => {
    setIsTriggering(true);
    setErrorMsg(null);
    setProgress(10);
    setStage('Initializing signal detector...');

    try {
      const res = await agentRunsService.startSignalDetection(companyId, leadId);
      if (res && res.data) {
        setCurrentRunId(res.data.id);
        setProgress(25);
        setStage('Queued for signal detection...');
      }
    } catch (err: any) {
      setIsTriggering(false);
      setProgress(0);
      setStage('');
      const serverMsg = err.response?.data?.message || err.message || 'Failed to start signal detection';
      setErrorMsg(serverMsg);
    }
  };

  const filteredSignals = signals.filter((sig) => {
    if (selectedType !== 'ALL' && sig.type !== selectedType) return false;
    if (selectedStrength !== 'ALL') {
      const strengthLabel = sig.strengthLabel || (sig.strength >= 0.85 ? 'STRONG' : sig.strength >= 0.7 ? 'MEDIUM' : 'WEAK');
      if (strengthLabel !== selectedStrength) return false;
    }
    return true;
  });

  const getStrengthBadge = (strength: number, label?: string) => {
    const strengthLabel = label || (strength >= 0.85 ? 'STRONG' : strength >= 0.7 ? 'MEDIUM' : 'WEAK');
    if (strengthLabel === 'STRONG') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">STRONG</span>;
    }
    if (strengthLabel === 'MEDIUM') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">MEDIUM</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-500/20 text-gray-300 border border-gray-500/40">WEAK</span>;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center space-x-2">
              <span>Verified Business Signals</span>
              {signals.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                  {signals.length} detected
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {companyName ? `Intelligence signals for ${companyName}` : 'Deterministic evidence-grounded company signals'}
            </p>
          </div>
        </div>

        <button
          onClick={handleStartDetection}
          disabled={isTriggering || !hasResearch}
          title={!hasResearch ? 'Run company research first' : undefined}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition-all duration-200 ${
            isTriggering || !hasResearch
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
          }`}
        >
          {isTriggering ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Detecting...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{signals.length > 0 ? 'Re-detect Signals' : 'Detect Signals'}</span>
            </>
          )}
        </button>
      </div>

      {/* Progress Bar (Active Run) */}
      <AnimatePresence>
        {isTriggering && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-3 pb-2 border-b border-slate-800/80"
          >
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
              <span className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span>{stage || 'Processing signal detection...'}</span>
              </span>
              <span className="font-mono text-indigo-400 font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start justify-between">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Detection Error</p>
              <p className="text-rose-400/90 mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button
            onClick={handleStartDetection}
            className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      {signals.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 pb-3 border-b border-slate-800 text-xs">
          <span className="text-slate-400">Filter:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Types ({signals.length})</option>
            {Object.keys(TYPE_COLORS).map((type) => {
              const count = signals.filter((s) => s.type === type).length;
              if (count === 0) return null;
              return (
                <option key={type} value={type}>
                  {type} ({count})
                </option>
              );
            })}
          </select>

          <select
            value={selectedStrength}
            onChange={(e) => setSelectedStrength(e.target.value)}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Strengths</option>
            <option value="STRONG">STRONG</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="WEAK">WEAK</option>
          </select>
        </div>
      )}

      {/* Signals List */}
      <div className="mt-4 space-y-3">
        {filteredSignals.length > 0 ? (
          filteredSignals.map((signal, index) => {
            const style = TYPE_COLORS[signal.type] || {
              bg: 'bg-slate-800',
              text: 'text-slate-300',
              border: 'border-slate-700',
            };

            return (
              <motion.div
                key={signal.id || signal.fingerprint || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                {/* Header row: Type badge, Strength, Confidence */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${style.bg} ${style.text} ${style.border}`}>
                      {signal.type}
                    </span>
                    {getStrengthBadge(signal.strength, signal.strengthLabel)}
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                      <span>Conf:</span>
                      <span className="font-mono text-white font-medium">{signal.confidence}%</span>
                    </div>
                    <div className="w-16 bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        data-testid="confidence-bar"
                        className={`h-full ${
                          signal.confidence >= 85
                            ? 'bg-emerald-400'
                            : signal.confidence >= 70
                            ? 'bg-amber-400'
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, signal.confidence))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Signal Title */}
                <h4 className="text-sm font-medium text-slate-100 mb-1.5">{signal.title}</h4>

                {/* Evidence Quote */}
                {signal.evidence && (
                  <div className="my-2 p-2 rounded bg-slate-900/80 border-l-2 border-indigo-500 text-xs text-slate-300 flex items-start space-x-2">
                    <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div className="italic break-words">"{signal.evidence}"</div>
                  </div>
                )}

                {/* Footer: Source link, fingerprint, date */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center space-x-2">
                    {signal.sourceUrl && (
                      <a
                        href={signal.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 hover:underline"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Verified Source</span>
                      </a>
                    )}
                    {signal.fingerprint && (
                      <span className="font-mono text-slate-500" title={`Fingerprint: ${signal.fingerprint}`}>
                        fp:{signal.fingerprint.slice(0, 8)}...
                      </span>
                    )}
                  </div>

                  {signal.detectedAt && (
                    <span>Detected {new Date(signal.detectedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            {!hasResearch ? (
              <div className="space-y-1">
                <p className="text-slate-300 font-medium">Company Research Required</p>
                <p>Run Company Research first to extract and ground business signals.</p>
              </div>
            ) : loading ? (
              <p>Loading signals...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-slate-300 font-medium">No Signals Detected Yet</p>
                <p>Click "Detect Signals" above to scan company research for actionable sales intelligence.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
