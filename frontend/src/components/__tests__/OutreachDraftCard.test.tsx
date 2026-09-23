import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OutreachDraftCard } from '../OutreachDraftCard';
import { outreachService } from '../../services/outreach.service';
import { agentRunsService } from '../../services/agentRuns.service';
import { vi } from 'vitest';

vi.mock('../../services/outreach.service', () => ({
  outreachService: {
    getLeadOutreach: vi.fn(),
    updateDraft: vi.fn(),
    approveDraft: vi.fn(),
    discardDraft: vi.fn(),
    regenerateDraft: vi.fn(),
    generateOutreach: vi.fn(),
  },
}));

vi.mock('../../services/agentRuns.service', () => ({
  agentRunsService: {
    getLatestRun: vi.fn(),
  },
}));

vi.mock('../../services/socket.service', () => ({
  socketService: {
    getSocket: vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
    })),
  },
}));

describe('OutreachDraftCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  const mockDraft = {
    id: 'draft-1',
    tenantId: 'tenant-1',
    leadId: 'lead-123',
    recommendationId: 'rec-1',
    type: 'FOLLOW_UP',
    status: 'DRAFT' as const,
    subject: "Supporting Stripe's engineering and operational growth",
    body: "Hi Patrick,\n\nI noticed Stripe is continuing to expand its engineering organization. Given your current growth, I thought it might be useful to connect around infrastructure needs.\n\nWould you be open to a short conversation this week?\n\nBest regards,\n[Your Name]",
    tone: 'PROFESSIONAL' as const,
    personalizationPoints: ['Referenced engineering hiring expansion at Stripe'],
    usedEvidence: ['HIRING', 'CONFIDENCE_88'],
    evidenceSnapshot: {},
    model: 'qwen2.5:3b',
    modelVersion: 'v1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('renders empty state when no drafts exist', async () => {
    vi.mocked(outreachService.getLeadOutreach).mockResolvedValue({
      success: true,
      data: [],
    });
    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });

    render(<OutreachDraftCard leadId="lead-123" companyName="Stripe" />);

    await waitFor(() => {
      expect(screen.getByText('No Outreach Draft Yet')).toBeInTheDocument();
      expect(screen.getByText('Generate Grounded Outreach Draft')).toBeInTheDocument();
    });
  });

  it('renders draft subject, body, status badge, and word count', async () => {
    vi.mocked(outreachService.getLeadOutreach).mockResolvedValue({
      success: true,
      data: [mockDraft],
    });
    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });

    render(<OutreachDraftCard leadId="lead-123" companyName="Stripe" />);

    await waitFor(() => {
      expect(screen.getByText("Supporting Stripe's engineering and operational growth")).toBeInTheDocument();
      expect(screen.getByText(/I noticed Stripe is continuing to expand/)).toBeInTheDocument();
      expect(screen.getByText('Draft — Needs Review')).toBeInTheDocument();
      expect(screen.getByText('PROFESSIONAL')).toBeInTheDocument();
    });
  });

  it('allows user to enter edit mode, change text and save edits', async () => {
    vi.mocked(outreachService.getLeadOutreach).mockResolvedValue({
      success: true,
      data: [mockDraft],
    });
    vi.mocked(outreachService.updateDraft).mockResolvedValue({
      success: true,
      data: {
        ...mockDraft,
        subject: 'Customized Subject for Patrick',
        status: 'EDITED',
      },
      message: 'Draft updated',
    });
    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });

    render(<OutreachDraftCard leadId="lead-123" companyName="Stripe" />);

    await waitFor(() => {
      expect(screen.getByText('Edit Draft')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Draft'));

    const subjectInput = screen.getByDisplayValue("Supporting Stripe's engineering and operational growth");
    fireEvent.change(subjectInput, { target: { value: 'Customized Subject for Patrick' } });

    fireEvent.click(screen.getByText('Save Edits'));

    await waitFor(() => {
      expect(outreachService.updateDraft).toHaveBeenCalledWith(
        'draft-1',
        expect.objectContaining({ subject: 'Customized Subject for Patrick' })
      );
    });
  });

  it('allows user to approve draft', async () => {
    vi.mocked(outreachService.getLeadOutreach).mockResolvedValue({
      success: true,
      data: [mockDraft],
    });
    vi.mocked(outreachService.approveDraft).mockResolvedValue({
      success: true,
      data: {
        ...mockDraft,
        status: 'APPROVED',
      },
      message: 'Draft approved',
    });
    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });

    render(<OutreachDraftCard leadId="lead-123" companyName="Stripe" />);

    await waitFor(() => {
      expect(screen.getByText('Approve Draft')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Approve Draft'));

    await waitFor(() => {
      expect(outreachService.approveDraft).toHaveBeenCalledWith('draft-1');
    });
  });

  it('allows user to copy draft to clipboard', async () => {
    vi.mocked(outreachService.getLeadOutreach).mockResolvedValue({
      success: true,
      data: [mockDraft],
    });
    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });

    render(<OutreachDraftCard leadId="lead-123" companyName="Stripe" />);

    await waitFor(() => {
      expect(screen.getByText('Copy Email')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Copy Email'));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("Subject: Supporting Stripe's engineering and operational growth")
    );
  });
});
