import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { agentRunsService } from '../services/agentRuns.service';
import type { SignalItem } from '../services/agentRuns.service';
import { socketService } from '../services/socket.service';

interface EnrichedSignal extends SignalItem {
  company?: {
    id: string;
    name: string;
    domain?: string;
  };
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

export const SignalCenter: React.FC = () => {
  const [signals, setSignals] = useState<EnrichedSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStrength, setSelectedStrength] = useState('ALL');
  const [minConfidence, setMinConfidence] = useState(50);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await agentRunsService.getAllSignals();
      if (res && res.data) {
        setSignals(res.data as EnrichedSignal[]);
      }
    } catch (err) {
      console.error('Failed to load signals feed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleCompleted = (data: any) => {
      if (data.agentType === 'signal_detection') {
        fetchSignals();
      }
    };

    socket.on('ai.agent.completed', handleCompleted);
    return () => {
      socket.off('ai.agent.completed', handleCompleted);
    };
  }, [fetchSignals]);

  // Filter signals
  const filteredSignals = signals.filter((sig) => {
    if (selectedType !== 'ALL' && sig.type !== selectedType) return false;

    const strengthLabel = sig.strengthLabel || (Number(sig.strength) >= 0.85 ? 'STRONG' : Number(sig.strength) >= 0.7 ? 'MEDIUM' : 'WEAK');
    if (selectedStrength !== 'ALL' && strengthLabel !== selectedStrength) return false;

    if (sig.confidence < minConfidence) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = sig.title.toLowerCase().includes(q);
      const matchEvidence = (sig.evidence || '').toLowerCase().includes(q);
      const matchCompany = (sig.company?.name || '').toLowerCase().includes(q);
      if (!matchTitle && !matchEvidence && !matchCompany) return false;
    }

    return true;
  });

  const getStrengthBadge = (strength: number | string, label?: string) => {
    const val = Number(strength);
    const strengthLabel = label || (val >= 0.85 ? 'STRONG' : val >= 0.7 ? 'MEDIUM' : 'WEAK');
    if (strengthLabel === 'STRONG') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">STRONG</span>;
    }
    if (strengthLabel === 'MEDIUM') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">MEDIUM</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-500/20 text-gray-300 border border-gray-500/40">WEAK</span>;
  };

  const strongCount = signals.filter((s) => Number(s.strength) >= 0.85 || s.strengthLabel === 'STRONG').length;
  const highConfCount = signals.filter((s) => s.confidence >= 80).length;
  const uniqueCompanies = new Set(signals.map((s) => s.company?.id).filter(Boolean)).size;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full text-slate-100" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Signal Center</h1>
              <p className="text-xs text-slate-400">Real-time, evidence-grounded intelligence signals across all accounts</p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSignals}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-2 transition-all active:scale-95 self-start md:self-auto"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{loading ? 'Refreshing...' : 'Refresh Feed'}</span>
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <p className="text-xs text-slate-400 font-medium">Total Signals</p>
          <p className="text-2xl font-black text-white mt-1">{signals.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Persisted in knowledge base</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <p className="text-xs text-emerald-400 font-medium">Strong Impact</p>
          <p className="text-2xl font-black text-emerald-300 mt-1">{strongCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">High strategic relevance</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <p className="text-xs text-indigo-400 font-medium">High Confidence</p>
          <p className="text-2xl font-black text-indigo-300 mt-1">{highConfCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Score &ge; 80%</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <p className="text-xs text-cyan-400 font-medium">Active Companies</p>
          <p className="text-2xl font-black text-cyan-300 mt-1">{uniqueCompanies}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Signals mapped to CRM</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 min-w-[240px] items-center bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs">
          <svg className="w-4 h-4 text-slate-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search signals by company, title, or evidence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-slate-200 outline-none w-full placeholder-slate-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white ml-1">
              &times;
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Types</option>
              {Object.keys(TYPE_COLORS).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Strength:</span>
            <select
              value={selectedStrength}
              onChange={(e) => setSelectedStrength(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Strengths</option>
              <option value="STRONG">STRONG</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="WEAK">WEAK</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Min Conf:</span>
            <select
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value={50}>50%</option>
              <option value={70}>70%</option>
              <option value={80}>80%</option>
              <option value={90}>90%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Signals Feed */}
      <div className="space-y-4">
        {filteredSignals.length > 0 ? (
          filteredSignals.map((signal, idx) => {
            const style = TYPE_COLORS[signal.type] || {
              bg: 'bg-slate-800',
              text: 'text-slate-300',
              border: 'border-slate-700',
            };

            return (
              <motion.div
                key={signal.id || signal.fingerprint || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-lg"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${style.bg} ${style.text} ${style.border}`}>
                      {signal.type}
                    </span>
                    {getStrengthBadge(signal.strength, signal.strengthLabel)}
                    {signal.company?.name && (
                      <span className="text-xs font-semibold text-slate-200 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                        {signal.company.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-400">
                      <span>Confidence:</span>
                      <span className="font-mono text-white font-bold">{signal.confidence}%</span>
                    </div>
                    <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          signal.confidence >= 85
                            ? 'bg-emerald-400'
                            : signal.confidence >= 70
                            ? 'bg-amber-400'
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${signal.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-white mb-2">{signal.title}</h3>

                {signal.description && (
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">{signal.description}</p>
                )}

                {signal.evidence && (
                  <div className="p-3 rounded-lg bg-slate-950/70 border-l-2 border-indigo-500 text-xs text-slate-300 flex items-start space-x-2 my-2">
                    <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="italic break-words">"{signal.evidence}"</span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                  <div className="flex items-center space-x-3">
                    {signal.sourceUrl && (
                      <a
                        href={signal.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 hover:underline"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Verified Source</span>
                      </a>
                    )}
                    {signal.fingerprint && (
                      <span className="font-mono text-slate-500 text-[11px]" title={`Deterministic Fingerprint: ${signal.fingerprint}`}>
                        fp:{signal.fingerprint.slice(0, 10)}...
                      </span>
                    )}
                  </div>

                  {signal.detectedAt && (
                    <span className="text-[11px] text-slate-500">
                      Detected {new Date(signal.detectedAt).toLocaleDateString()} at{' '}
                      {new Date(signal.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400 text-sm">
            {loading ? (
              <p>Loading signals feed...</p>
            ) : signals.length === 0 ? (
              <div className="space-y-2">
                <p className="text-slate-200 font-semibold text-base">No Signals in Knowledge Base</p>
                <p className="text-xs">Run Signal Detection on companies to populate this intelligence center.</p>
              </div>
            ) : (
              <p>No signals match the selected filters or search query.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
