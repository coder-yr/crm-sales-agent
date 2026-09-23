import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { outreachService } from '../services/outreach.service';
import type {
  OutreachDraftRecord,
  OutreachTone,
  OutreachDraftStatus,
} from '../services/outreach.service';
import { agentRunsService } from '../services/agentRuns.service';
import { socketService } from '../services/socket.service';

interface OutreachDraftCardProps {
  leadId: string;
  leadName?: string;
  companyName?: string;
  recommendationId?: string;
}

const TONES: { id: OutreachTone; label: string; desc: string }[] = [
  { id: 'PROFESSIONAL', label: 'Professional', desc: 'Balanced, polite, and consultative' },
  { id: 'CASUAL', label: 'Casual', desc: 'Friendly, low friction, and approachable' },
  { id: 'URGENT', label: 'Urgent', desc: 'Time-sensitive and direct' },
  { id: 'EXECUTIVE', label: 'Executive', desc: 'High-level, concise, and strategic' },
  { id: 'CONSULTATIVE', label: 'Consultative', desc: 'Advisory and problem-solving oriented' },
];

const STATUS_BADGE: Record<OutreachDraftStatus, { label: string; badge: string; icon: string }> = {
  DRAFT: {
    label: 'Draft — Needs Review',
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/25',
    icon: 'edit_note',
  },
  EDITED: {
    label: 'Draft Edited',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25',
    icon: 'draw',
  },
  APPROVED: {
    label: 'Approved for Outreach',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
    icon: 'check_circle',
  },
  DISCARDED: {
    label: 'Discarded',
    badge: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/25',
    icon: 'archive',
  },
};

export const OutreachDraftCard: React.FC<OutreachDraftCardProps> = ({
  leadId,
  leadName,
  companyName,
  recommendationId,
}) => {
  const [drafts, setDrafts] = useState<OutreachDraftRecord[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>('');
  const [selectedTone, setSelectedTone] = useState<OutreachTone>('PROFESSIONAL');
  const [showToneDropdown, setShowToneDropdown] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Evidence panel toggle
  const [showEvidence, setShowEvidence] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const activeDraft = drafts.find((d) => d.id === selectedDraftId) || drafts[0] || null;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDrafts = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await outreachService.getLeadOutreach(leadId);
      if (res && res.data) {
        setDrafts(res.data);
        if (res.data.length > 0 && !selectedDraftId) {
          setSelectedDraftId(res.data[0].id);
        }
      }

      // Check ongoing agent runs
      const runRes = await agentRunsService.getLatestRun('Lead', leadId, 'outreach');
      if (runRes && runRes.data) {
        if (runRes.data.status === 'RUNNING' || runRes.data.status === 'QUEUED') {
          setIsTriggering(true);
          setProgress(runRes.data.status === 'QUEUED' ? 20 : 60);
          setStage(runRes.data.status === 'QUEUED' ? 'Queued for outreach generation...' : 'Synthesizing outreach draft...');
        } else if (runRes.data.status === 'COMPLETED' || runRes.data.status === 'FAILED') {
          setIsTriggering(false);
          setProgress(0);
          setStage('');
        }
      }
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        console.error('Failed to load outreach drafts:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [leadId, selectedDraftId]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // Polling fallback when generation is underway to handle network drops or tab switching
  useEffect(() => {
    if (!isTriggering) return;
    const interval = setInterval(async () => {
      try {
        const runRes = await agentRunsService.getLatestRun('Lead', leadId, 'outreach');
        if (runRes && runRes.data) {
          if (runRes.data.status === 'COMPLETED') {
            setIsTriggering(false);
            setProgress(0);
            setStage('');
            await fetchDrafts();
            showToast('success', 'New outreach draft generated successfully');
          } else if (runRes.data.status === 'FAILED') {
            setIsTriggering(false);
            setProgress(0);
            setStage('');
            showToast('error', `Outreach generation failed: ${runRes.data.error || 'Unknown error'}`);
          }
        }
      } catch {
        // Silently continue polling
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isTriggering, leadId, fetchDrafts]);

  // Sync edit fields when activeDraft changes
  useEffect(() => {
    if (activeDraft) {
      setEditSubject(activeDraft.subject);
      setEditBody(activeDraft.body);
      setIsEditing(false);
    }
  }, [activeDraft?.id]);

  // Realtime Socket.IO subscriptions
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleAgentQueued = (data: any) => {
      if (data.entityId === leadId && data.agentType === 'outreach') {
        setIsTriggering(true);
        setProgress(15);
        setStage('Queued in outreach pipeline...');
      }
    };

    const handleAgentStarted = (data: any) => {
      if (data.agentType === 'outreach') {
        setIsTriggering(true);
        setProgress(35);
        setStage(data.stage || 'Synthesizing evidence-grounded draft...');
      }
    };

    const handleAgentProgress = (data: any) => {
      if (data.agentType === 'outreach' || isTriggering) {
        setProgress(data.progress || 65);
        if (data.stage) setStage(data.stage);
      }
    };

    const handleAgentCompleted = (data: any) => {
      if (data.agentType === 'outreach' || isTriggering) {
        setProgress(100);
        setStage('Draft generation complete!');
        setTimeout(() => {
          setIsTriggering(false);
          setProgress(0);
          setStage('');
          fetchDrafts();
          showToast('success', 'New outreach draft generated successfully');
        }, 800);
      }
    };

    const handleDraftGenerated = (data: any) => {
      if (data.leadId === leadId) {
        setIsTriggering(false);
        setProgress(0);
        setStage('');
        fetchDrafts();
        showToast('success', 'New outreach draft generated successfully');
      }
    };

    const handleAgentFailed = (data: any) => {
      if (data.agentType === 'outreach' || isTriggering) {
        setIsTriggering(false);
        setProgress(0);
        setStage('');
        showToast('error', `Outreach generation failed: ${data.error || 'Unknown error'}`);
      }
    };

    socket.on('ai.agent.queued', handleAgentQueued);
    socket.on('ai.agent.started', handleAgentStarted);
    socket.on('ai.agent.progress', handleAgentProgress);
    socket.on('ai.agent.completed', handleAgentCompleted);
    socket.on('outreach.draft.generated', handleDraftGenerated);
    socket.on('ai.agent.failed', handleAgentFailed);

    return () => {
      socket.off('ai.agent.queued', handleAgentQueued);
      socket.off('ai.agent.started', handleAgentStarted);
      socket.off('ai.agent.progress', handleAgentProgress);
      socket.off('ai.agent.completed', handleAgentCompleted);
      socket.off('outreach.draft.generated', handleDraftGenerated);
      socket.off('ai.agent.failed', handleAgentFailed);
    };
  }, [leadId, isTriggering, fetchDrafts]);

  // Trigger new generation
  const handleGenerate = async (tone?: OutreachTone) => {
    setIsTriggering(true);
    setProgress(10);
    setStage('Submitting outreach generation request...');
    try {
      const res = await outreachService.generateOutreach(leadId, recommendationId, tone || selectedTone);
      if (res && res.data && res.data.reused) {
        showToast('success', 'Generation run already in progress');
      }
    } catch (err: any) {
      setIsTriggering(false);
      showToast('error', err?.response?.data?.message || 'Failed to start outreach generation');
    }
  };

  // Regenerate draft
  const handleRegenerate = async (tone?: OutreachTone) => {
    if (!activeDraft) return;
    setIsTriggering(true);
    setProgress(10);
    setStage('Submitting regeneration request...');
    try {
      await outreachService.regenerateDraft(activeDraft.id, tone || selectedTone);
    } catch (err: any) {
      setIsTriggering(false);
      showToast('error', err?.response?.data?.message || 'Failed to regenerate draft');
    }
  };

  // Save edits
  const handleSaveEdits = async () => {
    if (!activeDraft) return;
    setIsSaving(true);
    try {
      const res = await outreachService.updateDraft(activeDraft.id, {
        subject: editSubject,
        body: editBody,
      });
      if (res && res.data) {
        setDrafts((prev) => prev.map((d) => (d.id === activeDraft.id ? res.data : d)));
        setIsEditing(false);
        showToast('success', 'Draft edits saved');
      }
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to save edits');
    } finally {
      setIsSaving(false);
    }
  };

  // Approve draft
  const handleApprove = async () => {
    if (!activeDraft) return;
    try {
      const res = await outreachService.approveDraft(activeDraft.id);
      if (res && res.data) {
        setDrafts((prev) => prev.map((d) => (d.id === activeDraft.id ? res.data : d)));
        showToast('success', 'Draft approved for outreach');
      }
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to approve draft');
    }
  };

  // Discard draft
  const handleDiscard = async () => {
    if (!activeDraft) return;
    try {
      const res = await outreachService.discardDraft(activeDraft.id);
      if (res && res.data) {
        setDrafts((prev) => prev.map((d) => (d.id === activeDraft.id ? res.data : d)));
        showToast('success', 'Draft moved to discarded');
      }
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to discard draft');
    }
  };

  // Copy email to clipboard
  const handleCopy = () => {
    if (!activeDraft) return;
    const fullText = `Subject: ${isEditing ? editSubject : activeDraft.subject}\n\n${isEditing ? editBody : activeDraft.body}`;
    navigator.clipboard.writeText(fullText);
    showToast('success', 'Subject & body copied to clipboard');
  };

  const wordCount = (isEditing ? editBody : activeDraft?.body || '').split(/\s+/).filter(Boolean).length;

  return (
    <div
      data-testid="outreach-draft-card"
      className="bg-white dark:bg-slate-900 border border-violet-500/25 dark:border-violet-500/20 rounded-2xl p-6 shadow-sm relative overflow-hidden transition-all duration-200"
    >
      {/* Background ambient gradient */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
            <span className="material-symbols-outlined text-[22px]">outgoing_mail</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                AI Outreach Draft
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                Phase 8
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalized email drafts for {leadName ? `${leadName} (${companyName || 'Lead'})` : companyName || 'Lead'} grounded in Deal Intelligence & signals
            </p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2">
          {/* Tone Selector */}
          <div className="relative">
            <button
              onClick={() => setShowToneDropdown(!showToneDropdown)}
              disabled={isTriggering}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
              title="Select outreach tone"
            >
              <span className="material-symbols-outlined text-[16px] text-violet-500">tune</span>
              <span>{TONES.find((t) => t.id === selectedTone)?.label || 'Tone'}</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            {showToneDropdown && (
              <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-30 py-1 overflow-hidden">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Outreach Tone
                </div>
                {TONES.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => {
                      setSelectedTone(tone.id);
                      setShowToneDropdown(false);
                      if (activeDraft && activeDraft.status !== 'APPROVED') {
                        handleRegenerate(tone.id);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex flex-col hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors ${
                      selectedTone === tone.id ? 'bg-violet-50/70 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300 font-medium' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{tone.label}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{tone.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Generate / Regenerate Button */}
          <button
            onClick={() => (activeDraft ? handleRegenerate() : handleGenerate())}
            disabled={isTriggering || loading}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white transition-all shadow-sm ${
              isTriggering
                ? 'bg-violet-400 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-700 active:scale-95 shadow-violet-500/20'
            }`}
          >
            <span className={`material-symbols-outlined text-[16px] ${isTriggering ? 'animate-spin' : ''}`}>
              {isTriggering ? 'sync' : activeDraft ? 'autorenew' : 'magic_button'}
            </span>
            <span>{isTriggering ? 'Generating...' : activeDraft ? 'Regenerate Draft' : 'Generate Outreach'}</span>
          </button>
        </div>
      </div>

      {/* Realtime progress bar */}
      <AnimatePresence>
        {isTriggering && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-violet-700 dark:text-violet-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  {stage || 'Synthesizing grounded outreach draft...'}
                </span>
                <span className="font-semibold text-violet-600 dark:text-violet-400">{progress}%</span>
              </div>
              <div className="w-full bg-violet-200/50 dark:bg-violet-950/60 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="bg-violet-600 h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">
                {toast.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {loading && drafts.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <span className="material-symbols-outlined text-3xl animate-spin mb-2 text-violet-500">
            progress_activity
          </span>
          <p className="text-xs">Loading outreach drafts...</p>
        </div>
      ) : activeDraft ? (
        <div className="space-y-4">
          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  STATUS_BADGE[activeDraft.status]?.badge || 'bg-slate-100 text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {STATUS_BADGE[activeDraft.status]?.icon || 'info'}
                </span>
                {STATUS_BADGE[activeDraft.status]?.label || activeDraft.status}
              </span>

              {/* Outreach Type Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
                <span className="material-symbols-outlined text-[13px] text-violet-500">label</span>
                {activeDraft.type.replace(/_/g, ' ')}
              </span>

              {/* Tone Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
                <span className="material-symbols-outlined text-[13px] text-violet-500">tune</span>
                {activeDraft.tone}
              </span>

              {/* Model Tag */}
              <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                {activeDraft.model || 'Deterministic Grounded Engine'}
              </span>
            </div>

            {/* Word count & Timestamp */}
            <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{new Date(activeDraft.createdAt || activeDraft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Draft Tabs if multiple */}
          {drafts.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-medium text-slate-400 mr-1">Drafts:</span>
              {drafts.map((d, idx) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedDraftId(d.id);
                    setIsEditing(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                    d.id === activeDraft.id
                      ? 'bg-violet-600 text-white font-medium shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>#{idx + 1}</span>
                  <span className="text-[10px] opacity-75">{d.status}</span>
                </button>
              ))}
            </div>
          )}

          {/* Subject Line Container */}
          <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Subject Line
              </label>
              {!isEditing && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeDraft.subject);
                    showToast('success', 'Subject copied to clipboard');
                  }}
                  className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[13px]">content_copy</span>
                  Copy Subject
                </button>
              )}
            </div>

            {isEditing ? (
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="w-full text-sm font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-violet-500/40 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                placeholder="Enter email subject line..."
              />
            ) : (
              <p className="text-sm font-semibold text-slate-900 dark:text-white select-text">
                {activeDraft.subject}
              </p>
            )}
          </div>

          {/* Email Body Container */}
          <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Email Body
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5"
                  title="Copy full email with subject"
                >
                  <span className="material-symbols-outlined text-[13px]">content_copy</span>
                  Copy Email
                </button>
              </div>
            </div>

            {isEditing ? (
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={9}
                className="w-full text-xs sm:text-sm font-normal text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-violet-500/40 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-violet-500/20 leading-relaxed font-sans"
                placeholder="Enter email draft text..."
              />
            ) : (
              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans select-text">
                {activeDraft.body}
              </div>
            )}
          </div>

          {/* Evidence & Personalization Pill Drawer */}
          <div className="border border-slate-200/60 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowEvidence(!showEvidence)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-violet-500">verified</span>
                <span>Personalization Evidence & Factual Grounding</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold">
                  {(activeDraft.personalizationPoints?.length || 0) + (activeDraft.usedEvidence?.length || 0)} facts
                </span>
              </div>
              <span className="material-symbols-outlined text-[16px] transition-transform duration-200" style={{ transform: showEvidence ? 'rotate(180deg)' : 'none' }}>
                expand_more
              </span>
            </button>

            {showEvidence && (
              <div className="p-3.5 bg-white dark:bg-slate-900 space-y-3 text-xs border-t border-slate-200/60 dark:border-slate-800">
                {/* Personalization Points */}
                {activeDraft.personalizationPoints && activeDraft.personalizationPoints.length > 0 && (
                  <div>
                    <h5 className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">
                      Personalization Drivers
                    </h5>
                    <ul className="space-y-1">
                      {activeDraft.personalizationPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <span className="material-symbols-outlined text-[14px] text-violet-500 mt-0.5 shrink-0">
                            check_circle
                          </span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Used Evidence */}
                {activeDraft.usedEvidence && activeDraft.usedEvidence.length > 0 && (
                  <div>
                    <h5 className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">
                      Grounded Evidence Citations
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {activeDraft.usedEvidence.map((ev, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 rounded text-[11px] border border-violet-500/15"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendation Linked */}
                {activeDraft.recommendation && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Recommendation Action:
                    </span>{' '}
                    {activeDraft.recommendation.actionTitle || activeDraft.recommendation.reasoning || 'Follow-up aligned with sales playbook'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer: Human-in-the-Loop Approval & Editing */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveEdits}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">save</span>
                    <span>{isSaving ? 'Saving...' : 'Save Edits'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditSubject(activeDraft.subject);
                      setEditBody(activeDraft.body);
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={activeDraft.status === 'APPROVED'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  title={activeDraft.status === 'APPROVED' ? 'Approved draft cannot be edited' : 'Edit draft'}
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                  <span>Edit Draft</span>
                </button>
              )}

              {/* Copy Full Email Button */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">content_copy</span>
                <span>Copy</span>
              </button>
            </div>

            {/* Approval & Discard Buttons */}
            <div className="flex items-center gap-2">
              {activeDraft.status !== 'DISCARDED' && (
                <button
                  onClick={handleDiscard}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                  title="Discard this outreach draft"
                >
                  <span className="material-symbols-outlined text-[15px]">delete_outline</span>
                  <span>Discard</span>
                </button>
              )}

              {activeDraft.status !== 'APPROVED' ? (
                <button
                  onClick={handleApprove}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-sm transition-all shadow-emerald-500/20"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Approve Draft</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-500/20">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Ready for Manual Send</span>
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-2xl">mark_email_unread</span>
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            No Outreach Draft Yet
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
            Transform Deal Intelligence and active signals into an evidence-grounded outreach email draft tailored for {companyName || 'this account'}.
          </p>
          <button
            onClick={() => handleGenerate()}
            disabled={isTriggering}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-md shadow-violet-500/25 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">magic_button</span>
            <span>Generate Grounded Outreach Draft</span>
          </button>
        </div>
      )}
    </div>
  );
};
